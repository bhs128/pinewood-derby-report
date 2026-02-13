import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

/**
 * Generate a PDF from an HTML element
 * @param {HTMLElement} element - The element to convert to PDF
 * @param {string} filename - The output filename
 */
export async function generatePDF(element, filename = 'pinewood-derby-report.pdf') {
  // Wait for charts to render
  await new Promise(resolve => setTimeout(resolve, 500))
  
  // Capture element as canvas
  const canvas = await html2canvas(element, {
    scale: 2,  // Higher resolution
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight
  })
  
  // Calculate dimensions for landscape letter size
  const imgWidth = 11  // inches
  const imgHeight = 8.5  // inches
  
  // Create PDF in landscape orientation
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'in',
    format: 'letter'
  })
  
  // Calculate scaling to fit content
  const canvasAspect = canvas.width / canvas.height
  const pageAspect = imgWidth / imgHeight
  
  let finalWidth = imgWidth - 1  // 0.5" margins
  let finalHeight = finalWidth / canvasAspect
  
  if (finalHeight > imgHeight - 1) {
    finalHeight = imgHeight - 1
    finalWidth = finalHeight * canvasAspect
  }
  
  // Center on page
  const xOffset = (imgWidth - finalWidth) / 2
  const yOffset = (imgHeight - finalHeight) / 2
  
  // Add image to PDF
  const imgData = canvas.toDataURL('image/png')
  pdf.addImage(imgData, 'PNG', xOffset, yOffset, finalWidth, finalHeight)
  
  // Save the PDF
  pdf.save(filename)
}

/**
 * Generate a multi-page PDF for larger reports
 * @param {HTMLElement} element - The element to convert to PDF
 * @param {string} filename - The output filename
 */
export async function generateMultiPagePDF(element, filename = 'pinewood-derby-report.pdf') {
  await new Promise(resolve => setTimeout(resolve, 500))
  
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff'
  })
  
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'in',
    format: 'letter'
  })
  
  const pageWidth = 11
  const pageHeight = 8.5
  const margin = 0.5
  
  const contentWidth = pageWidth - (margin * 2)
  const contentHeight = pageHeight - (margin * 2)
  
  // Scale canvas to fit page width
  const scale = contentWidth / (canvas.width / 96 / 2)  // 96 DPI, scale factor 2
  const scaledHeight = (canvas.height / 96 / 2) * scale
  
  // If content fits on one page
  if (scaledHeight <= contentHeight) {
    const imgData = canvas.toDataURL('image/png')
    pdf.addImage(imgData, 'PNG', margin, margin, contentWidth, scaledHeight)
  } else {
    // Multi-page: split content
    const pageContentHeight = contentHeight / scale * 96 * 2
    let position = 0
    let pageNum = 0
    
    while (position < canvas.height) {
      if (pageNum > 0) {
        pdf.addPage()
      }
      
      // Create a temporary canvas for this page section
      const pageCanvas = document.createElement('canvas')
      pageCanvas.width = canvas.width
      pageCanvas.height = Math.min(pageContentHeight, canvas.height - position)
      
      const ctx = pageCanvas.getContext('2d')
      ctx.drawImage(
        canvas,
        0, position,
        canvas.width, pageCanvas.height,
        0, 0,
        canvas.width, pageCanvas.height
      )
      
      const imgData = pageCanvas.toDataURL('image/png')
      const imgHeight = (pageCanvas.height / canvas.width) * contentWidth
      pdf.addImage(imgData, 'PNG', margin, margin, contentWidth, imgHeight)
      
      position += pageContentHeight
      pageNum++
    }
  }
  
  pdf.save(filename)
}
