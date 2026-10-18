import fs from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
export async function customerFixture(){
 const db=new PGlite();
 for(const f of ['20261007_console066.sql','20261016_marketing_workspace.sql'])await db.exec(await fs.readFile(new URL('../migrations/'+f,import.meta.url),'utf8'));
 await db.exec(`CREATE TABLE mailing_subscribers(id bigserial PRIMARY KEY,email text,name text,status text DEFAULT 'active',source text DEFAULT 'archivo066',language text,country text,consent_method text,consent_version text,consent_at timestamptz,unsubscribe_token text,unsubscribed_at timestamptz,last_email_sent_at timestamptz,created_at timestamptz DEFAULT now(),utm_source text,utm_medium text,utm_campaign text);
 CREATE TABLE orders(id bigserial PRIMARY KEY,external_reference text UNIQUE,payment_status text,payment_status_detail text,live_mode boolean DEFAULT true,buyer_name text,buyer_email text,buyer_phone text,region_name text,commune text,street text,street_number text,address_extra text,book_price integer DEFAULT 15990,shipping_amount integer DEFAULT 3000,total_amount integer DEFAULT 18990,currency text DEFAULT 'CLP',mercado_pago_approved_at timestamptz,created_at timestamptz DEFAULT now(),utm_source text,utm_medium text,utm_campaign text,referrer_host text);
 CREATE TABLE order_email_events(external_reference text,email_type text,status text,scheduled_for timestamptz,sent_at timestamptz,canceled_at timestamptz,created_at timestamptz DEFAULT now());
 INSERT INTO mailing_subscribers(email,name,consent_at,unsubscribe_token) VALUES ('reader@example.test','Lector QA',now(),repeat('a',64)),('READER@example.test','Duplicado QA',now(),repeat('b',64)),('buyer@example.test','Comprador QA',now(),repeat('c',64)),('optout@example.test','Baja QA',now(),repeat('d',64));
 UPDATE mailing_subscribers SET unsubscribed_at=now(),status='unsubscribed' WHERE email='optout@example.test';
 INSERT INTO mailing_subscribers(email,name) VALUES ('noconsent@example.test','Sin permiso QA');
 INSERT INTO orders(external_reference,payment_status,buyer_name,buyer_email) VALUES ('LLAVE-QA-PAID','approved','Comprador QA','buyer@example.test'),('LLAVE-QA-PENDING','pending','Checkout QA','pending@example.test');
 UPDATE orders SET created_at=now()-interval '3 hours' WHERE payment_status='pending';`);
 await db.exec("ALTER TABLE order_email_events ADD COLUMN resend_email_id text; CREATE TABLE mailing_sequence_emails(id bigserial PRIMARY KEY,resend_email_id text);");
 await db.exec(await fs.readFile(new URL('../migrations/20261018_mail_receipts066.sql',import.meta.url),'utf8'));
 const migration=await fs.readFile(new URL('../migrations/20261016_customer_mail.sql',import.meta.url),'utf8');await db.exec(migration);await db.exec(migration);
 const sql=async(parts,...values)=>(await db.query(parts.map((p,i)=>p+(i<values.length?'$'+(i+1):'')).join(''),values)).rows;
 return {db,sql};
}
