import fs from 'fs'
import { glob } from 'glob'
import path from 'path'

async function testManualLinks() {
  console.log('🔍 Testing manual links...\n')

  // Get all manual and QA files
  const manualFiles = await glob('docs/manual/**/*.md', { ignore: 'docs/manual/README.md' })
  const qaFiles = await glob('docs/qa/**/*.md')
  const allFiles = [...manualFiles, ...qaFiles]

  // Extract all internal links
  const linkPattern = /\[([^\]]+)\]\((\/(?:manual|qa)\/[^)]+)\)/g
  const foundLinks = new Map<string, string[]>()

  for (const filePath of allFiles) {
    const content = fs.readFileSync(filePath, 'utf-8')
    const matches = content.matchAll(linkPattern)

    for (const match of matches) {
      const linkUrl = match[2]
      if (!foundLinks.has(linkUrl)) {
        foundLinks.set(linkUrl, [])
      }
      foundLinks.get(linkUrl)!.push(filePath)
    }
  }

  console.log(`Found ${foundLinks.size} unique internal links\n`)

  // Check if each linked file exists
  let errors = 0
  let success = 0

  for (const [linkUrl, sourceFiles] of foundLinks) {
    // Convert URL to file path
    // /manual/tool_management → docs/manual/tool_management.md
    // /manual/scenarios/daily/daily_workflow → docs/manual/scenarios/daily/daily_workflow.md
    const filePath = linkUrl.replace(/^\/(manual|qa)\//, 'docs/$1/') + '.md'

    if (fs.existsSync(filePath)) {
      success++
      console.log(`✓ ${linkUrl}`)
    } else {
      errors++
      console.error(`✗ ${linkUrl} - FILE NOT FOUND!`)
      console.error(`  Referenced in: ${sourceFiles[0]}`)
      if (sourceFiles.length > 1) {
        console.error(`  And ${sourceFiles.length - 1} other file(s)`)
      }
    }
  }

  console.log(`\n📊 Results:`)
  console.log(`  ✓ Valid links: ${success}`)
  console.log(`  ✗ Broken links: ${errors}`)

  if (errors > 0) {
    console.error(`\n❌ Found ${errors} broken link(s)!`)
    process.exit(1)
  } else {
    console.log(`\n✅ All links are valid!`)
  }
}

testManualLinks().catch(console.error)
