import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const migration = readFileSync(new URL("../migrations/0001_initial.sql", import.meta.url), "utf8");

function dbWithFixtures() {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(migration);
  const user = db.prepare("INSERT INTO users(id,display_name) VALUES (?,?)");
  for (const [id,name] of [["a","Member A"],["b","Member B"],["c","Outsider"]]) user.run(id,name);
  db.prepare("INSERT INTO households(id,name,created_by) VALUES (?,?,?)").run("h","Test household","a");
  const member = db.prepare("INSERT INTO household_members(household_id,user_id) VALUES (?,?)");
  member.run("h","a");
  member.run("h","b");
  const account = db.prepare(
    "INSERT INTO accounts(id,household_id,owner_user_id,kind,name,visibility,opening_balance_cents) " +
    "VALUES (?,?,?,?,?,?,?)"
  );
  account.run("pa","h","a","personal","A checking","private",10000);
  account.run("pb","h","b","personal","B checking","private",3000);
  account.run("bill","h",null,"bill_pay","Bill-Pay","full",0);
  account.run("grocer","h",null,"groceries","Groceries","full",0);
  return db;
}

const insert = (db,event) => db.prepare(
  "INSERT INTO ledger_events(id,household_id,actor_user_id,kind,from_account_id," +
  "to_account_id,amount_cents,description,occurred_on,client_operation_id)" +
  " VALUES (?,?,?,?,?,?,?,?,?,?)"
).run(event.id,"h",event.actor??"a",event.kind,event.from??null,event.to??null,
  event.amount,"Synthetic QA","2026-11-03",event.operation??event.id);

const balance = (db,id) => db.prepare(
  "SELECT balance_cents FROM account_balances WHERE account_id=?"
).get(id).balance_cents;

test("schema migration creates all required tables and does not seed real users", () => {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(migration);
  const tables = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
  ).all().map(r=>r.name);
  for (const name of ["users","households","household_members","passkeys","sessions",
    "recovery_codes","invitations","accounts","ledger_events","audit_events"]) {
    assert.ok(tables.includes(name), "missing " + name);
  }
  assert.equal(db.prepare("SELECT count(*) AS n FROM users").get().n,0);
  db.close();
});

test("transfers are atomic events and never count as expenses or income", () => {
  const db=dbWithFixtures();
  insert(db,{ id:"income1",kind:"income",to:"pa",amount:5000 });
  insert(db,{ id:"transfer1",kind:"transfer",from:"pa",to:"bill",amount:4000 });
  insert(db,{ id:"expense1",kind:"expense",from:"bill",amount:1500 });
  assert.equal(balance(db,"pa"),11000);
  assert.equal(balance(db,"pb"),3000);
  assert.equal(balance(db,"bill"),2500);
  assert.equal(balance(db,"grocer"),0);
  assert.equal(db.prepare("SELECT count(*) AS n FROM ledger_events WHERE kind='expense'").get().n,1);
  assert.equal(db.prepare("SELECT count(*) AS n FROM ledger_events WHERE kind='transfer'").get().n,1);
  assert.equal(balance(db,"pa")+balance(db,"pb")+balance(db,"bill")+balance(db,"grocer"),16500);
  db.close();
});

test("replaying client operation ID cannot apply money changes twice",()=>{
  const db=dbWithFixtures();
  insert(db,{id:"first",kind:"income",to:"pa",amount:2500,operation:"replay"});
  assert.throws(()=>insert(db,{id:"other",kind:"income",to:"pa",amount:2500,operation:"replay"}),/UNIQUE/);
  assert.equal(balance(db,"pa"),12500);
  db.close();
});

test("private-account edits, outsider edits and cross-household access are rejected",()=>{
  const db=dbWithFixtures();
  assert.throws(()=>insert(db,{id:"b-steal",actor:"b",kind:"expense",from:"pa",amount:1}),/unavailable/);
  assert.throws(()=>insert(db,{id:"c-edit",actor:"c",kind:"income",to:"bill",amount:1}),/household member/);
  db.prepare("INSERT INTO households(id,name,created_by) VALUES (?,?,?)").run("h2","Other household","c");
  db.prepare("INSERT INTO household_members(household_id,user_id) VALUES (?,?)").run("h2","c");
  db.prepare("INSERT INTO accounts(id,household_id,owner_user_id,kind,name,visibility) VALUES (?,?,?,?,?,?)")
    .run("other","h2","c","personal","Other private","private");
  assert.throws(()=>insert(db,{id:"cross",actor:"a",kind:"income",to:"other",amount:1}),/unavailable/);
  db.close();
});

test("overdrafted transfers, self-transfers and zero amounts fail closed",()=>{
  const db=dbWithFixtures();
  assert.throws(()=>insert(db,{id:"bad",kind:"transfer",from:"pa",to:"bill",amount:10001}),/insufficient/);
  assert.throws(()=>insert(db,{id:"self",kind:"transfer",from:"pa",to:"pa",amount:1}),/CHECK/);
  assert.throws(()=>insert(db,{id:"zero",kind:"income",to:"pa",amount:0}),/CHECK/);
  assert.equal(balance(db,"bill"),0);
  db.close();
});

test("immutable journal and locked opening balances prevent quiet rewrites",()=>{
  const db=dbWithFixtures();
  insert(db,{id:"expense",kind:"expense",from:"pa",amount:200});
  assert.throws(()=>db.exec("UPDATE ledger_events SET amount_cents=999 WHERE id='expense'"),/immutable/);
  assert.throws(()=>db.exec("DELETE FROM ledger_events WHERE id='expense'"),/immutable/);
  assert.throws(()=>db.exec("UPDATE accounts SET opening_balance_cents=0 WHERE id='pa'"),/locked/);
  assert.equal(balance(db,"pa"),9800);
  db.close();
});

test("household membership hard limit is two",()=>{
  const db=dbWithFixtures();
  assert.throws(()=>db.exec("INSERT INTO household_members(household_id,user_id) VALUES ('h','c')"),/limit/);
  db.close();
});
