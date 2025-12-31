-- CHECK CONSTRAINTS ON SETTLEMENTS
-- Run this in your Supabase SQL Editor to verify why upsert might fail
SELECT 
    conname as constraint_name, 
    pg_get_constraintdef(con.oid) as constraint_definition
FROM pg_constraint con
INNER JOIN pg_class rel ON rel.oid = con.conrelid
INNER JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public' AND rel.relname = 'settlements';
