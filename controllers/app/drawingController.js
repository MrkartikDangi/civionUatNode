const generic = require("../../config/genricFn/common");
const { validationResult, matchedData } = require("express-validator");
const drawing = require("../../models/drawingModel")
const fs = require('fs');
// const pdfParse = require('pdf-parse');
// const { PDFDocument } = require('pdf-lib');
const path = require("path")



// exports.mergePdf = async (req, res) => {
//     try {
//         if (!req.files.originalPdf || !req.files.originalPdf.length) {
//             return generic.error(req, res, {
//                 message: "Please upload original pdf",
//             });
//         }
//         if (!req.files.mergingPdf || !req.files.mergingPdf.length) {
//             return generic.error(req, res, {
//                 message: "Please upload merging pdf",
//             });
//         }


//         const { pdfDoc: pdf1, map: map1 } = await generic.extractDrawingMap({ path: req.files.originalPdf[0]?.path });
//         const { pdfDoc: pdf2, map: map2 } = await generic.extractDrawingMap({ path: req.files.mergingPdf[0]?.path });
//         const finalPdf = await PDFDocument.create();
//         const replacedDrawings = [];
//         console.log('map1', map1)
//         console.log('map2', map2)


//         for (const [drawingNo, index1] of map1.entries()) {
//             let pageToCopy;
//             if (map2.has(drawingNo)) {
//                 // Replace with PDF2's page
//                 const index2 = map2.get(drawingNo);
//                 [pageToCopy] = await finalPdf.copyPages(pdf2, [index2]);
//                 replacedDrawings.push(drawingNo)
//             } else {
//                 // Keep original
//                 [pageToCopy] = await finalPdf.copyPages(pdf1, [index1]);
//             }
//             finalPdf.addPage(pageToCopy);
//         }
//         console.log('replacedDrawings', replacedDrawings)


//         const finalBytes = await finalPdf.save();
//         // let outputPath = path.join(__dirname, `../../uploads/`)
//         if (finalBytes) {
//             fs.unlinkSync(req.files.originalPdf[0]?.path)
//             fs.unlinkSync(req.files.mergingPdf[0]?.path)
//             const fileName = `merged_${Date.now()}.pdf`;
//             const outputPath = path.join(__dirname, '..', '..', 'uploads', fileName);

//             fs.writeFileSync(outputPath, finalBytes);
//             let Maildata = {
//                 to: "kpdangi660@gmail.com",
//                 cc: "Faizahmadofficial293@gmail.com",
//                 bcc: "kanhaiyalalverma686@gmail.com",
//                 subject: `Merged Pdf`,
//                 html: '',
//                 attachments: [
//                     {
//                         filename: `Merged Pdf`,
//                         content: finalBytes,
//                         encoding: 'base64',
//                     },
//                 ],
//             };

//             // let result = await generic.sendEmails(Maildata);
//             return generic.success(req, res, {
//                 message: "Both PDFs merged successfully",
//                 data: {
//                     mergedPdf: `http://${process.env.HOST}:${process.env.PORT}/uploads/${fileName}`
//                 }
//             });


//         }


//     } catch (error) {
//         console.log('error', error)
//         return generic.error(req, res, {
//             status: 500,
//             message: "something went wrong!",
//         });

//     }
// }
exports.mergePdf = async (req, res) => {
    try {
        if (!req.files.originalPdf?.length || !req.files.mergingPdf?.length) {
            return res.status(400).json({ message: "Please upload both PDFs" });
        }

        // Extract maps
        const { map: map1 } = await generic.extractDrawingMap({ path: req.files.originalPdf[0].path });
        const { map: map2 } = await generic.extractDrawingMap({ path: req.files.mergingPdf[0].path });

        const drawingNumbers1 = [...map1.keys()];
        const drawingNumbers2 = [...map2.keys()];

        console.log("Original PDF Drawing Numbers:", drawingNumbers1.length ? drawingNumbers1 : "❌ None found");
        console.log("Merging PDF Drawing Numbers:", drawingNumbers2.length ? drawingNumbers2 : "❌ None found");

        // Agar dono me se koi empty hai to merge skip karke error return
        if (!drawingNumbers1.length || !drawingNumbers2.length) {
            return res.status(400).json({
                message: "No drawing numbers found in one or both PDFs",
                drawingNumbers1,
                drawingNumbers2
            });
        }

        // Load PDFs with pdf-lib
        const pdf1Buffer = fs.readFileSync(req.files.originalPdf[0].path);
        const pdf2Buffer = fs.readFileSync(req.files.mergingPdf[0].path);
        const pdf1 = await PDFDocument.load(pdf1Buffer);
        const pdf2 = await PDFDocument.load(pdf2Buffer);

        const finalPdf = await PDFDocument.create();
        const replacedDrawings = [];

        const totalPages = pdf1.getPageCount();
        for (let i = 0; i < totalPages; i++) {
            const matchDrawing = [...map1.entries()].find(([_, idx]) => idx === i)?.[0];

            let pageToAdd;
            if (matchDrawing && map2.has(matchDrawing)) {
                console.log('1')
                const idx2 = map2.get(matchDrawing);
                [pageToAdd] = await finalPdf.copyPages(pdf2, [idx2]);
                replacedDrawings.push(matchDrawing);
            } else {
                [pageToAdd] = await finalPdf.copyPages(pdf1, [i]);
            }
            finalPdf.addPage(pageToAdd);
        }

        // Save merged PDF
        const finalBytes = await finalPdf.save();
        fs.unlinkSync(req.files.originalPdf[0].path);
        fs.unlinkSync(req.files.mergingPdf[0].path);

        const fileName = `merged_${Date.now()}.pdf`;
        const outputPath = path.join(__dirname, "..", "..", "uploads", fileName);
        fs.writeFileSync(outputPath, finalBytes);

        return res.status(200).json({
            message: "PDF merge complete",
            replacedDrawings,
            data: {
                mergedPdf: `http://${process.env.HOST}:${process.env.PORT}/uploads/${fileName}`
            }
        });

    } catch (error) {
        console.error("Merge PDF error:", error);
        return res.status(500).json({ message: "Error while merging PDFs" });
    }
};



