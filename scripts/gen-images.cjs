const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const sharp = require('sharp');

const API_KEY = 'VkZSqSsuNL1NGWFi4PMhelYkkfc8q48p';
const MODEL = 'google:4@3'; // Nano Banana 2

// Generate at supported size, then resize to target
async function generate(prompt, targetW, targetH, outputPath) {
  // Use 1264x848 (closest to 1280x800 in 3:2-ish ratio)
  // For square-ish: 1024x1024. For wide banners: 1584x672
  let genW, genH;
  const ratio = targetW / targetH;
  if (ratio > 2.2) { // very wide (1400x560 = 2.5)
    genW = 1584; genH = 672;
  } else if (ratio > 1.3) { // wide (1280x800 = 1.6, 1200x630 = 1.9)
    genW = 1264; genH = 848;
  } else { // square-ish (440x280 = 1.57)
    genW = 1264; genH = 848;
  }

  const taskUUID = randomUUID();
  console.log(`Generating ${path.basename(outputPath)} (${genW}x${genH} -> ${targetW}x${targetH})...`);
  const res = await fetch('https://api.runware.ai/v1', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify([{
      taskType: 'imageInference',
      taskUUID,
      positivePrompt: prompt,
      width: genW,
      height: genH,
      model: MODEL,
      numberResults: 1,
      outputFormat: 'PNG',
    }]),
  });
  const json = await res.json();
  if (json.errors?.length) {
    console.error(`ERROR ${path.basename(outputPath)}:`, json.errors[0].message);
    return false;
  }
  const imageURL = json.data[0].imageURL;
  const imgRes = await fetch(imageURL);
  const buf = Buffer.from(await imgRes.arrayBuffer());

  // Resize to exact target dimensions
  await sharp(buf)
    .resize(targetW, targetH, { fit: 'cover' })
    .png()
    .toFile(outputPath);

  console.log(`OK: ${path.basename(outputPath)}`);
  return true;
}

async function main() {
  const storeDir = path.join(__dirname, '..', 'store');
  const ssDir = path.join(storeDir, 'screenshots');

  // Screenshot 1: Smart Task Manager
  await generate(
    'Professional marketing screenshot for a Chrome browser extension productivity app. Shows a clean modern UI popup with a task list. The popup has a teal green header bar with the app name. Below are task cards on white background with colored priority indicators - red dot for urgent, amber dot for medium, green dot for low priority. Each task card shows a task title and due date. There is a daily focus section highlighted in teal. A completed task shown with strikethrough text and "+15 XP" badge. Bottom navigation bar with keyboard shortcuts. Left side has large bold marketing text. Bright clean design with light mint background, teal and white color scheme. Flat modern SaaS style. No photographs of people.',
    1280, 800, path.join(ssDir, '01-smart-tasks.png')
  );

  // Screenshot 2: Deep Work / Pomodoro
  await generate(
    'Professional marketing screenshot for a Pomodoro timer Chrome extension. Shows a clean white card UI with a large circular timer progress ring in teal green color, showing time "18:42" in large bold numbers in the center, "of 25 minutes" text below. Timer preset buttons showing 15, 25, 45, 90 minute options. A red "Hard Lock ON" warning badge. The left side has large bold marketing headline text "Deep Work Mode" with feature description. Bright light mint green background. Clean modern flat SaaS marketing style. Teal, white, and orange accent colors. No photographs of people.',
    1280, 800, path.join(ssDir, '02-deep-work.png')
  );

  // Screenshot 3: Site Blocker
  await generate(
    'Professional marketing screenshot for a website blocker Chrome extension. Shows a clean white card UI with site blocking categories - Social Media with red accent and toggle switch ON, News with amber accent and toggle ON, Entertainment with purple accent and toggle OFF, Shopping with blue accent and toggle OFF. Each category shows site count number. Below is a schedule section showing "Mon-Fri 9AM-5PM" with toggle. Left side has large bold marketing text "Block Distractions" with colorful category pill badges. Bright light mint green background. Clean modern flat design. Teal and white color scheme. No photographs.',
    1280, 800, path.join(ssDir, '03-site-blocker.png')
  );

  // Screenshot 4: Gamification
  await generate(
    'Professional marketing screenshot for a gamification productivity Chrome extension. Shows a clean white card UI with a teal gradient level card showing "Level 5 EXPERT 520 XP" with an orange XP progress bar. Below is a weekly activity bar chart in varying teal shades. Stats grid with four cards: "7 Done today", "12 Day streak" in orange, "89% Completion", "24h Focus time". Left side has large bold marketing headline "Level Up Your Productivity" in dark teal and orange. Bright light mint green background. Modern flat SaaS design. No photographs of people.',
    1280, 800, path.join(ssDir, '04-gamification.png')
  );

  // Screenshot 5: Privacy
  await generate(
    'Professional marketing screenshot for a privacy-first Chrome extension. Centered layout design. Large bold heading "100% Private" in dark teal at top. Subtitle "Your data never leaves your device" in gray. Three large white stat cards in a row, each showing a big teal number "0" with labels: "Network requests ever made", "Accounts required works instantly", "Data collected no analytics". Below are three teal pill buttons labeled "MIT License", "Open Source", "Works Offline". Bright light mint green background. Clean minimal modern flat design. No photographs.',
    1280, 800, path.join(ssDir, '05-privacy.png')
  );

  // Marquee promo tile 1400x560
  await generate(
    'Wide professional marketing banner for AyaMir Chrome browser extension. Left side shows a teal rounded square app icon with a shield and clock symbol inside, next to it large bold dark teal title text "AyaMir" with subtitle "Pomodoro Timer, Task Manager & Site Blocker for Chrome" in gray. Center area has four white feature cards in a horizontal row labeled "Pomodoro Timer", "Smart Tasks", "Site Blocker", "Gamification" each with a short description underneath. Bottom center has tagline text "No accounts. No cloud. No tracking. Just focus." with three teal rounded pill buttons "No Account" "Open Source" "5 Languages". Bright light mint green background. Clean professional flat SaaS marketing style. No photographs of people. Very wide banner format.',
    1400, 560, path.join(storeDir, 'marquee-promo-tile.png')
  );

  // Small promo tile 440x280
  await generate(
    'Small promotional tile image for AyaMir Chrome extension. Perfectly centered layout. Top center: teal rounded square icon with white shield clock symbol. Below center: large bold dark teal title "AyaMir". Below: subtitle "Pomodoro, Tasks & Site Blocker" in gray text, centered. Below: "No accounts. No tracking." in small gray text, centered. Bottom center: teal rounded pill button saying "All-in-one. Open source." Everything perfectly centered vertically and horizontally. Light mint green background. Clean minimal flat design. No photographs.',
    440, 280, path.join(storeDir, 'small-promo-tile.png')
  );

  // OG Image 1200x630
  await generate(
    'Social media Open Graph preview image for AyaMir Chrome browser extension. Centered layout. Top center: teal rounded square app icon with shield clock symbol. Large bold dark teal title "AyaMir" centered below icon. Subtitle "Pomodoro Timer, Task Manager & Site Blocker" in gray centered. Four white feature cards in a horizontal row: "Pomodoro Timer", "Smart Tasks", "Site Blocker", "100% Private" each with descriptions. Below: teal "Install Free" button centered. Light mint green background. Professional clean flat SaaS marketing style. No photographs of people.',
    1200, 630, path.join(__dirname, '..', 'docs', 'og-image.png')
  );

  console.log('\nAll images generated!');
}

main().catch(console.error);
