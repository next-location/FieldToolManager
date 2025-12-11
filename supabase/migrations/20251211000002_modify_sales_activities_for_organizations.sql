-- Modify sales_activities table to reference organization_id instead of sales_lead_id
-- This allows sales activities to be directly linked to organizations

-- First, add the new organization_id column
ALTER TABLE sales_activities
ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Migrate existing data from sales_leads to organizations
-- If there are existing sales_activities, link them to the organization via sales_lead
UPDATE sales_activities sa
SET organization_id = sl.organization_id
FROM sales_leads sl
WHERE sa.sales_lead_id = sl.id;

-- Make organization_id NOT NULL after data migration
ALTER TABLE sales_activities
ALTER COLUMN organization_id SET NOT NULL;

-- Drop the old sales_lead_id column
ALTER TABLE sales_activities
DROP COLUMN sales_lead_id;

-- Add index for query performance
CREATE INDEX idx_sales_activities_organization_id ON sales_activities(organization_id);
CREATE INDEX idx_sales_activities_organization_created ON sales_activities(organization_id, created_at DESC);

-- Add comment for documentation
COMMENT ON COLUMN sales_activities.organization_id IS '営業活動が紐づく組織ID';
