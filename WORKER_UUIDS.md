# Worker UUIDs

Here are 5 randomly generated UUIDs for your workers table:

1. `69a03256-f91c-4aa6-abf1-4b92001f0341`
2. `21ee0f65-01f1-4ed2-93a1-a878f7fb4fea`
3. `fc5b4e00-6f9d-4fb2-9d4b-910453328a09`
4. `cdba3c32-dcfe-42a6-a38e-b422f07648ad`
5. `a64b5dcf-576e-4e25-87c9-0f69cd46a991`

## Database Setup

**Important:** Make sure you've created the `workers` table first (see README.md for the full schema).

Run this SQL in your Supabase SQL Editor to insert these worker UUIDs:

```sql
-- Create workers table
CREATE TABLE IF NOT EXISTS workers (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert the 5 workers (update with actual names and emails)
INSERT INTO workers (id, name, email) VALUES
  ('69a03256-f91c-4aa6-abf1-4b92001f0341', 'Worker Name 1', 'worker1@example.com'),
  ('21ee0f65-01f1-4ed2-93a1-a878f7fb4fea', 'Worker Name 2', 'worker2@example.com'),
  ('fc5b4e00-6f9d-4fb2-9d4b-910453328a09', 'Worker Name 3', 'worker3@example.com'),
  ('cdba3c32-dcfe-42a6-a38e-b422f07648ad', 'Worker Name 4', 'worker4@example.com'),
  ('a64b5dcf-576e-4e25-87c9-0f69cd46a991', 'Worker Name 5', 'worker5@example.com')
ON CONFLICT (id) DO NOTHING;

-- Add RLS policies for workers table
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;

-- Drop policy if it exists, then create it (to avoid errors if already exists)
DROP POLICY IF EXISTS "Allow anonymous reads on workers" ON workers;

CREATE POLICY "Allow anonymous reads on workers"
ON workers
FOR SELECT
TO anon
USING (true);
```

Replace the placeholder names and emails with actual worker information.

