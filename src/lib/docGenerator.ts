import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

export async function generateDocument(templateUrl: string, data: any, outputName: string) {
  try {
    // 1. Fetch template from URL (e.g. from /templates/baogia.docx in public folder)
    const response = await fetch(templateUrl);
    const arrayBuffer = await response.arrayBuffer();

    // 2. Unzip and parse
    const zip = new PizZip(arrayBuffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    // 3. Render data
    doc.render(data);

    // 4. Generate docx binary
    const out = doc.getZip().generate({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    // 5. Download
    const url = URL.createObjectURL(out);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${outputName}.docx`;
    link.click();
    URL.revokeObjectURL(url);
    
    return true;
  } catch (error) {
    console.error("Error generating document:", error);
    throw error;
  }
}
