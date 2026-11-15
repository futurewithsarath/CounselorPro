/**
 * CounselorPro — Social Media Result Card Generator
 * Generates beautiful, pixel-perfect PNG images via HTML5 Canvas:
 * 1. Instagram Story & WhatsApp Status (9:16 — 1080 x 1920 px)
 * 2. Square Post for Feeds (1:1 — 1080 x 1080 px)
 * 
 * Supports privacy toggles (hiding rank / category).
 */

export interface SocialCardData {
  exam: string;
  stream?: string;
  rank?: number | string | null;
  category?: string;
  totalChoices: number;
  allotted: boolean;
  collegeName?: string;
  collegeCode?: string;
  branchName?: string;
  preferenceNumber?: number;
  probabilityRange?: string;
  includeRank?: boolean;
  includeCategory?: boolean;
}

export type SocialCardFormat = 'story' | 'square';

export async function generateSocialCardBlob(
  data: SocialCardData,
  format: SocialCardFormat = 'story'
): Promise<Blob> {
  const isStory = format === 'story';
  const width = 1080;
  const height = isStory ? 1920 : 1080;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not initialize 2D canvas context');

  // 1. Rich Gradient Background (Deep Slate to Midnight Emerald)
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#0B132B');
  bgGrad.addColorStop(0.5, '#111E38');
  bgGrad.addColorStop(1, '#062B21');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Decorative Ambient Glow Rings
  const glow = ctx.createRadialGradient(width * 0.8, height * 0.15, 50, width * 0.8, height * 0.15, 450);
  glow.addColorStop(0, 'rgba(0, 209, 128, 0.25)');
  glow.addColorStop(1, 'rgba(0, 209, 128, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  const glow2 = ctx.createRadialGradient(width * 0.15, height * 0.8, 50, width * 0.15, height * 0.8, 500);
  glow2.addColorStop(0, 'rgba(16, 185, 129, 0.18)');
  glow2.addColorStop(1, 'rgba(16, 185, 129, 0)');
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, width, height);

  // Helper: Rounded Rectangle
  function drawRoundedRect(x: number, y: number, w: number, h: number, r: number, fill: string, stroke?: string, strokeW = 2) {
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.lineWidth = strokeW;
      ctx.strokeStyle = stroke;
      ctx.stroke();
    }
  }

  // 3. Top Header: Branding
  const topY = isStory ? 140 : 80;
  
  // CounselorPro Pill Badge
  drawRoundedRect(width / 2 - 200, topY, 400, 52, 26, 'rgba(16, 185, 129, 0.15)', 'rgba(16, 185, 129, 0.5)', 2);
  ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#34D399';
  ctx.textAlign = 'center';
  ctx.fillText('COUNSELORPRO INTELLIGENCE', width / 2, topY + 34);

  // Practice Only Pill
  const pillY = topY + 74;
  drawRoundedRect(width / 2 - 170, pillY, 340, 40, 20, 'rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.2)', 1.5);
  ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#CBD5E1';
  ctx.fillText('MOCK RESULT • PRACTICE ONLY', width / 2, pillY + 26);

  // Main Heading: Exam Name
  const headingY = pillY + (isStory ? 120 : 80);
  ctx.font = '900 52px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  const cleanExam = data.exam.replace('_', ' ');
  ctx.fillText(cleanExam, width / 2, headingY);

  ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#94A3B8';
  ctx.fillText(`${data.stream || 'General'} Stream Counselling Simulation`, width / 2, headingY + 45);

  // 4. Candidate Parameters Summary Badges
  const statsY = headingY + (isStory ? 110 : 80);
  const cardW = 280;
  const cardH = isStory ? 130 : 100;
  const gap = 30;
  const startX = (width - (cardW * 3 + gap * 2)) / 2;

  // Stat 1: Merit Rank
  drawRoundedRect(startX, statsY, cardW, cardH, 20, 'rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.12)', 2);
  ctx.font = 'bold 18px sans-serif';
  ctx.fillStyle = '#94A3B8';
  ctx.fillText('CANDIDATE RANK', startX + cardW / 2, statsY + 38);
  ctx.font = '900 36px sans-serif';
  ctx.fillStyle = '#34D399';
  const rankText = data.includeRank && data.rank ? `#${Number(data.rank).toLocaleString()}` : 'Protected';
  ctx.fillText(rankText, startX + cardW / 2, statsY + (isStory ? 90 : 76));

  // Stat 2: Category / Reservation
  drawRoundedRect(startX + cardW + gap, statsY, cardW, cardH, 20, 'rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.12)', 2);
  ctx.font = 'bold 18px sans-serif';
  ctx.fillStyle = '#94A3B8';
  ctx.fillText('CATEGORY', startX + cardW + gap + cardW / 2, statsY + 38);
  ctx.font = '900 36px sans-serif';
  ctx.fillStyle = '#FFFFFF';
  const catText = data.includeCategory && data.category ? String(data.category) : 'Merit';
  ctx.fillText(catText, startX + cardW + gap + cardW / 2, statsY + (isStory ? 90 : 76));

  // Stat 3: Choices
  drawRoundedRect(startX + (cardW + gap) * 2, statsY, cardW, cardH, 20, 'rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.12)', 2);
  ctx.font = 'bold 18px sans-serif';
  ctx.fillStyle = '#94A3B8';
  ctx.fillText('PREFERENCES', startX + (cardW + gap) * 2 + cardW / 2, statsY + 38);
  ctx.font = '900 36px sans-serif';
  ctx.fillStyle = '#38BDF8';
  ctx.fillText(`${data.totalChoices} Colleges`, startX + (cardW + gap) * 2 + cardW / 2, statsY + (isStory ? 90 : 76));

  // 5. Hero Feature Card: The Practice Allotment Outcome
  const heroY = statsY + cardH + (isStory ? 70 : 40);
  const heroW = width - 160;
  const heroH = isStory ? 520 : 360;
  const heroX = 80;

  if (data.allotted && data.collegeName) {
    // Emerald Success Card
    drawRoundedRect(heroX, heroY, heroW, heroH, 30, 'rgba(6, 78, 59, 0.45)', 'rgba(16, 185, 129, 0.65)', 3);

    // Header badge
    drawRoundedRect(heroX + 35, heroY + 35, 300, 44, 22, 'rgba(16, 185, 129, 0.3)', 'rgba(16, 185, 129, 0.8)', 2);
    ctx.font = 'bold 20px sans-serif';
    ctx.fillStyle = '#6EE7B7';
    ctx.textAlign = 'left';
    ctx.fillText('✓ HISTORICAL CUTOFF MATCH', heroX + 55, heroY + 64);

    // Preference number pill
    drawRoundedRect(heroX + heroW - 200, heroY + 35, 165, 44, 22, 'rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.4)', 2);
    ctx.font = '900 22px sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText(`Choice #${data.preferenceNumber || 1}`, heroX + heroW - 117, heroY + 65);

    // College Name (wrapped if long)
    ctx.font = '900 42px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';

    const maxW = heroW - 70;
    const words = data.collegeName.split(' ');
    let line = '';
    let textY = heroY + (isStory ? 140 : 125);
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxW && n > 0) {
        ctx.fillText(line.trim(), heroX + 35, textY);
        line = words[n] + ' ';
        textY += 50;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line.trim(), heroX + 35, textY);

    // Details Grid inside hero
    const innerY = textY + (isStory ? 45 : 30);
    ctx.font = 'bold 24px sans-serif';
    ctx.fillStyle = '#A7F3D0';
    ctx.fillText(`Code: ${data.collegeCode || 'UNKN'}  •  Branch: ${data.branchName || 'CSE'}`, heroX + 35, innerY);

    // Proximity badge
    if (isStory) {
      const pillBoxY = innerY + 35;
      drawRoundedRect(heroX + 35, pillBoxY, heroW - 70, 70, 16, 'rgba(0, 0, 0, 0.35)', 'rgba(16, 185, 129, 0.3)', 1.5);
      ctx.font = 'bold 22px sans-serif';
      ctx.fillStyle = '#34D399';
      ctx.fillText(`📈 Historical Cutoff Proximity: ${data.probabilityRange || 'HIGH'} Range Match`, heroX + 55, pillBoxY + 44);
    }
  } else {
    // Amber / Red No Match Card
    drawRoundedRect(heroX, heroY, heroW, heroH, 30, 'rgba(127, 29, 29, 0.35)', 'rgba(239, 68, 68, 0.6)', 3);
    
    ctx.font = '900 36px sans-serif';
    ctx.fillStyle = '#FCA5A5';
    ctx.textAlign = 'left';
    ctx.fillText('NO CUTOFF MATCH IN CURRENT SELECTIONS', heroX + 40, heroY + 80);

    ctx.font = 'normal 24px sans-serif';
    ctx.fillStyle = '#E2E8F0';
    ctx.fillText('Selections were more competitive than historical cutoff boundaries.', heroX + 40, heroY + 140);
    ctx.fillText('Recommendation: Add 3 to 5 realistic safety colleges to your list.', heroX + 40, heroY + 185);
  }

  // 6. Educational Disclaimer Box
  const discY = heroY + heroH + (isStory ? 60 : 35);
  ctx.textAlign = 'center';
  ctx.font = 'normal 19px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#94A3B8';
  ctx.fillText('Educational simulation based on verified government cutoff datasets.', width / 2, discY);
  ctx.fillText('Not an official seat allotment or guarantee of future admission.', width / 2, discY + 28);

  // 7. Footer: Watermark Branding
  const footY = isStory ? height - 90 : height - 50;
  ctx.font = '900 28px sans-serif';
  ctx.fillStyle = '#34D399';
  ctx.fillText('counselorpro.in', width / 2, footY);
  ctx.font = 'normal 18px sans-serif';
  ctx.fillStyle = '#64748B';
  ctx.fillText('Avoid Locking Mistakes • Check Admissions Probability Free', width / 2, footY + 30);

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas to Blob conversion failed'));
    }, 'image/png');
  });
}

export async function downloadSocialCard(
  data: SocialCardData,
  format: SocialCardFormat = 'story',
  customFilename?: string
): Promise<string> {
  const blob = await generateSocialCardBlob(data, format);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const defaultName = `CounselorPro_${data.exam}_${data.stream || 'Result'}_${format === 'story' ? 'Story_9x16' : 'Post_1x1'}.png`;
  a.download = customFilename || defaultName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  return url;
}
