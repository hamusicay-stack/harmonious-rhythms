// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";
import QRCode from "https://esm.sh/qrcode@1.5.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { course_id } = await req.json();
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "unauthorized" }, 401);

    const { data: enr } = await admin.from("academy_enrollments")
      .select("progress_percent").eq("user_id", user.id).eq("course_id", course_id).maybeSingle();
    if (!enr || enr.progress_percent < 100) return json({ error: "course not completed" }, 400);

    const { data: course } = await admin.from("academy_courses").select("title").eq("id", course_id).maybeSingle();
    const { data: profile } = await admin.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
    const { data: existing } = await admin.from("academy_certificates").select("id, pdf_url, certificate_number").eq("user_id", user.id).eq("course_id", course_id).maybeSingle();

    if (existing?.pdf_url) return json({ pdf_url: existing.pdf_url, certificate_number: existing.certificate_number });

    const recipient = profile?.display_name || user.email || "תלמיד";
    const courseTitle = course?.title ?? "קורס";
    const certNum = `MUS-${Date.now().toString(36).toUpperCase()}`;

    // Build verify URL — points to public verify page on the site
    const origin = req.headers.get("origin") || "https://hamusicai.lovable.app";
    const verifyUrl = `${origin}/verify/${certNum}`;

    // Generate QR PNG bytes
    const qrDataUrl: string = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 220, errorCorrectionLevel: "M" });
    const qrBytes = base64ToUint8(qrDataUrl.split(",")[1]);

    // Build PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([842, 595]); // A4 landscape
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const qrImage = await pdfDoc.embedPng(qrBytes);

    // Decorative border
    page.drawRectangle({ x: 20, y: 20, width: 802, height: 555, borderColor: rgb(0.4, 0.2, 0.7), borderWidth: 4 });
    page.drawRectangle({ x: 30, y: 30, width: 782, height: 535, borderColor: rgb(0.85, 0.7, 0.95), borderWidth: 1 });

    // Heading
    page.drawText("Certificate of Completion", { x: 220, y: 480, size: 36, font, color: rgb(0.4, 0.2, 0.7) });
    page.drawText("HaMusician Academy", { x: 310, y: 440, size: 18, font: fontReg, color: rgb(0.3, 0.3, 0.3) });
    page.drawText("Awarded to:", { x: 360, y: 360, size: 16, font: fontReg });
    page.drawText(recipient, { x: 100, y: 310, size: 32, font, color: rgb(0, 0, 0) });
    page.drawText("For successfully completing the course:", { x: 250, y: 250, size: 14, font: fontReg });
    page.drawText(courseTitle, { x: 100, y: 200, size: 22, font, color: rgb(0.4, 0.2, 0.7) });

    // QR code (bottom right) + verification text
    page.drawImage(qrImage, { x: 700, y: 80, width: 90, height: 90 });
    page.drawText("Scan to verify", { x: 705, y: 65, size: 8, font: fontReg, color: rgb(0.4, 0.4, 0.4) });

    page.drawText(`Certificate #: ${certNum}`, { x: 60, y: 80, size: 10, font: fontReg });
    page.drawText(`Issued: ${new Date().toLocaleDateString("en-GB")}`, { x: 60, y: 60, size: 10, font: fontReg });
    page.drawText(`Verify at: ${verifyUrl}`, { x: 60, y: 40, size: 8, font: fontReg, color: rgb(0.4, 0.4, 0.4) });

    const bytes = await pdfDoc.save();
    const filePath = `${user.id}/${certNum}.pdf`;
    const { error: upErr } = await admin.storage.from("academy").upload(`certificates/${filePath}`, bytes, {
      contentType: "application/pdf", upsert: true,
    });
    if (upErr) return json({ error: upErr.message }, 500);

    const { data: signed } = await admin.storage.from("academy").createSignedUrl(`certificates/${filePath}`, 60 * 60 * 24 * 365);
    const pdfUrl = signed?.signedUrl;

    if (existing) {
      await admin.from("academy_certificates").update({ pdf_url: pdfUrl }).eq("id", existing.id);
    } else {
      await admin.from("academy_certificates").insert({
        user_id: user.id, course_id, certificate_number: certNum,
        recipient_name: recipient, course_title: courseTitle, pdf_url: pdfUrl,
      });
    }
    return json({ pdf_url: pdfUrl, certificate_number: certNum });
  } catch (e: any) {
    return json({ error: e.message }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function base64ToUint8(b64: string): Uint8Array {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}
