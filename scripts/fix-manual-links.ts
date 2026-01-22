import fs from 'fs'
import path from 'path'
import { glob } from 'glob'

async function fixManualLinks() {
  console.log('🔍 Fixing manual links...\n')

  // Find all markdown files in docs/manual and docs/qa
  const manualFiles = await glob('docs/manual/**/*.md', { ignore: 'docs/manual/README.md' })
  const qaFiles = await glob('docs/qa/**/*.md')
  const allFiles = [...manualFiles, ...qaFiles]

  let totalFixed = 0

  for (const filePath of allFiles) {
    let content = fs.readFileSync(filePath, 'utf-8')
    let modified = false

    // Fix relative links to manual files: ./file.md or ../file.md → /manual/file
    const relativeManualLinkPattern = /\[([^\]]+)\]\(\.\.?\/(?:manual\/)?([a-z_]+)\.md\)/g
    if (relativeManualLinkPattern.test(content)) {
      content = content.replace(
        /\[([^\]]+)\]\(\.\.?\/(?:manual\/)?([a-z_]+)\.md\)/g,
        '[$1](/manual/$2)'
      )
      modified = true
    }

    // Fix relative links to qa files: ./file.md or ../file.md → /qa/file
    const relativeQaLinkPattern = /\[([^\]]+)\]\(\.\.?\/(?:qa\/)?([a-z_]+)\.md\)/g
    if (relativeQaLinkPattern.test(content)) {
      content = content.replace(
        /\[([^\]]+)\]\(\.\.?\/(?:qa\/)?([a-z_]+)\.md\)/g,
        '[$1](/qa/$2)'
      )
      modified = true
    }

    // Fix links in scenarios subdirectories
    const scenarioLinkPattern = /\[([^\]]+)\]\(\.\.?\/\.\.?\/([a-z_\/]+)\.md\)/g
    if (scenarioLinkPattern.test(content)) {
      content = content.replace(
        /\[([^\]]+)\]\(\.\.?\/\.\.?\/([a-z_\/]+)\.md\)/g,
        (match, text, filePath) => {
          // If path contains "scenarios/", keep it as is under /manual/
          if (filePath.includes('scenarios/')) {
            return `[${text}](/manual/${filePath})`
          }
          // Otherwise assume it's a top-level manual file
          return `[${text}](/manual/${filePath.replace(/.*\//, '')})`
        }
      )
      modified = true
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf-8')
      totalFixed++
      console.log(`✓ ${filePath}`)
    }
  }

  console.log(`\n✅ Fixed ${totalFixed} files!`)
}

fixManualLinks().catch(console.error)
