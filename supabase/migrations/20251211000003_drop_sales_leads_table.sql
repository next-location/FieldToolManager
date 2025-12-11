-- Drop the sales_leads table as it's no longer needed
-- All sales information is now managed directly in the organizations table

-- Drop the table and all its data
DROP TABLE IF EXISTS sales_leads CASCADE;

-- Note: The CASCADE option will automatically drop any dependent objects
-- In this case, foreign key constraints from sales_activities have already been removed
-- in the previous migration (20251211000002)
