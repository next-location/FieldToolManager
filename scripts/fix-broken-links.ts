import fs from 'fs'
import { glob } from 'glob'

async function fixBrokenLinks() {
  console.log('🔧 Fixing broken links...\n')

  const allFiles = [
    ...await glob('docs/manual/**/*.md', { ignore: 'docs/manual/README.md' }),
    ...await glob('docs/qa/**/*.md')
  ]

  let totalFixed = 0

  for (const filePath of allFiles) {
    let content = fs.readFileSync(filePath, 'utf-8')
    let modified = false

    // Fix double /manual/manual/ paths
    if (content.includes('/manual/manual/')) {
      content = content.replace(/\/manual\/manual\//g, '/manual/')
      modified = true
      console.log(`✓ Fixed double path in ${filePath}`)
    }

    // Fix double /qa/qa/ paths
    if (content.includes('/qa/qa/')) {
      content = content.replace(/\/qa\/qa\//g, '/qa/')
      modified = true
      console.log(`✓ Fixed double path in ${filePath}`)
    }

    // Remove or comment out links to non-existent files
    const brokenLinks = [
      '/manual/tool_masters',
      '/manual/tools_create',
      '/manual/settings_locations',
      '/manual/payments',
      '/manual/equipment_cost_analysis',
      '/manual/equipment_analytics',
      '/manual/inventory_list',
      '/manual/consumable_ordering',
      '/manual/physical_inventory',
      '/manual/attendance_clock_in',
      '/manual/attendance_clock_out',
      '/manual/attendance_reports',
      '/manual/qr_printing',
      '/manual/invoices_send',
      '/manual/settings_operations',
      '/manual/alerts',
      '/manual/sales',
      '/manual/expenses',
      '/manual/attendance_report',
      '/manual/purchase_orders_payment',
      '/manual/attendance_issues',
      '/manual/tool_issues',
      '/manual/qr_scan_issues',
      '/manual/mobile_usage',
    ]

    for (const brokenLink of brokenLinks) {
      const linkPattern = new RegExp(`\\[([^\\]]+)\\]\\(${brokenLink.replace(/\//g, '\\/')}\\)`, 'g')
      if (linkPattern.test(content)) {
        // Replace with just the text (remove link)
        content = content.replace(linkPattern, '$1')
        modified = true
        console.log(`✓ Removed broken link ${brokenLink} in ${filePath}`)
      }
    }

    // Fix scenarios links that should be full paths
    const scenariosLinks = [
      { from: '/manual/tool_lost_or_damaged', to: '/manual/scenarios/tool_operations/tool_lost_or_damaged' },
      { from: '/manual/tool_handover', to: '/manual/scenarios/tool_operations/tool_handover' },
      { from: '/manual/tool_maintenance', to: '/manual/scenarios/tool_operations/tool_maintenance' },
      { from: '/manual/tool_bulk_operations', to: '/manual/scenarios/tool_operations/tool_bulk_operations' },
      { from: '/manual/emergency_response', to: '/manual/scenarios/security/emergency_response' },
      { from: '/manual/security_best_practices', to: '/manual/scenarios/security/security_best_practices' },
      { from: '/manual/troubleshooting_common', to: '/manual/scenarios/security/troubleshooting_common' },
      { from: '/manual/leader_quick_guide', to: '/manual/scenarios/role_guides/leader_quick_guide' },
      { from: '/manual/staff_quick_guide', to: '/manual/scenarios/role_guides/staff_quick_guide' },
      { from: '/manual/manager_quick_guide', to: '/manual/scenarios/role_guides/manager_quick_guide' },
      { from: '/manual/admin_quick_guide', to: '/manual/scenarios/role_guides/admin_quick_guide' },
      { from: '/manual/qr_code_guide', to: '/manual/scenarios/mobile/qr_code_guide' },
      { from: '/manual/inventory_audit', to: '/manual/scenarios/admin_operations/inventory_audit' },
      { from: '/manual/new_employee_onboarding', to: '/manual/scenarios/admin_operations/new_employee_onboarding' },
      { from: '/manual/employee_offboarding', to: '/manual/scenarios/admin_operations/employee_offboarding' },
    ]

    for (const { from, to } of scenariosLinks) {
      const linkPattern = new RegExp(`\\]\\(${from.replace(/\//g, '\\/')}\\)`, 'g')
      if (linkPattern.test(content)) {
        content = content.replace(linkPattern, `](${to})`)
        modified = true
        console.log(`✓ Fixed scenario link ${from} → ${to} in ${filePath}`)
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf-8')
      totalFixed++
    }
  }

  console.log(`\n✅ Fixed ${totalFixed} files!`)
}

fixBrokenLinks().catch(console.error)
