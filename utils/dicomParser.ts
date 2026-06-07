// @ts-ignore
import * as daikon from 'daikon';

export const parseDicomFile = async (file: File): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        if (!event.target?.result) throw new Error("File read failed");
        
        const data = new DataView(event.target.result as ArrayBuffer);
        const image = daikon.Series.parseImage(data);
        
        if (!image) {
          throw new Error("Could not parse DICOM image");
        }

        const width = image.getCols();
        const height = image.getRows();
        const numFrames = image.getNumberOfFrames() || 1;
        const frames: string[] = [];

        // Window level
        const wc = image.getWindowCenter() || 0;
        const ww = image.getWindowWidth() || 0;
        
        let min, max;
        if (ww > 0) {
            min = wc - (ww / 2.0);
            max = wc + (ww / 2.0);
        } else {
            min = image.getImageMin() || 0;
            max = image.getImageMax() || 255;
            if (min === max) {
              min = 0;
              max = 255; // fallback
            }
        }
        const windowRange = max - min;

        for (let f = 0; f < numFrames; f++) {
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;

          const imageData = ctx.createImageData(width, height);
          const pixels = image.getInterpretedData(f); // Get data for frame f
          
          for (let i = 0; i < pixels.length; i++) {
            let value = pixels[i];
            if (value <= min) value = 0;
            else if (value >= max) value = 255;
            else value = ((value - min) / windowRange) * 255;
            
            const offset = i * 4;
            imageData.data[offset] = value;     // R
            imageData.data[offset + 1] = value; // G
            imageData.data[offset + 2] = value; // B
            imageData.data[offset + 3] = 255;   // A
          }
          
          ctx.putImageData(imageData, 0, 0);
          frames.push(canvas.toDataURL('image/jpeg', 0.9));
        }
        
        resolve(frames);
        
      } catch (err) {
        console.error("DICOM Parsing Error:", err);
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};
