
const prompt=require("./prompt.js");
const express = require('express');
const app = express();
const path = require('path');

require("dotenv").config();

const Groq = require("groq-sdk");

const multer = require('multer');

const pdf = require('pdf-parse-new');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 },
});

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

const engine = require('ejs-mate');

app.engine('ejs', engine);

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use((req, res, next) => {
    res.locals.currentPath = req.path;
    next();
});

app.get('/', (req, res) => {
    res.render("home.ejs");
});

app.get('/upload', (req, res) => {
    res.render("upload.ejs");
});

app.post('/upload', upload.single('resume'), async (req, res) => {

    try {

        if (!req.file?.buffer) {
            return res.status(400).send("No resume file received");
        }

        const dataBuffer = req.file.buffer;

        // Extract Text
        const data = await pdf(dataBuffer);

        const resumeText = data.text;

        console.log(resumeText);

        // Groq AI
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

        // AI Response
        async function getGroqChatCompletion(resumeText) {

            return await groq.chat.completions.create({
        
                messages: [
        
                    {
                        role: "system",
                        content: prompt
                    },
        
                    {
                        role: "user",
                        content: resumeText
                    }
        
                ],
        
                model: "openai/gpt-oss-20b",
            });
        
        }
        
        function parseAnalysisJson(raw) {
            const trimmed = String(raw || "").trim();
            const unfenced = trimmed
                .replace(/^```(?:json)?\s*/i, "")
                .replace(/\s*```$/i, "")
                .trim();
            const parsed = JSON.parse(unfenced);
            const listKeys = [
                "technical_skills",
                "resume_improvements",
                "interview_readiness",
                "best_career_roles",
            ];
            for (const key of listKeys) {
                if (!Array.isArray(parsed[key])) {
                    parsed[key] = [];
                }
            }
            if (typeof parsed.ats_score !== "number") {
                parsed.ats_score = Number(parsed.ats_score) || 0;
            }
            delete parsed.missing_skills;
            return parsed;
        }

        const emptyAnalysis = {
            ats_score: 0,
            technical_skills: [],
            resume_improvements: [],
            interview_readiness: [],
            best_career_roles: [],
        };

        // Main function
        async function main() {
        
            const chatCompletion =
                await getGroqChatCompletion(resumeText);
        
            const rawContent =
                chatCompletion.choices[0]?.message?.content || "";

            console.log(rawContent);

            let result = emptyAnalysis;
            try {
                result = parseAnalysisJson(rawContent);
            } catch (e) {
                console.error("Failed to parse analysis JSON:", e);
            }

            res.render("dashboard.ejs", { result });
        }
        
        // Execute function
        await main();

    } catch (err) {

        console.log(err);

        res.send("Error processing resume");
    }

});

app.get('/dashboard', (req, res) => {
    res.render("dashboard.ejs", {
        result: {
            ats_score: 0,
            technical_skills: [],
            resume_improvements: [],
            interview_readiness: [],
            best_career_roles: [],
        },
    });
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('Server is running on port 3000');
});











// const prompt=require('./prompt.js');
// const express = require('express');
// const app = express();
// const path = require('path');

// require("dotenv").config();
// const { GoogleGenAI } = require("@google/genai");

// const multer  = require('multer')
// const upload = multer({ dest: 'uploads/' })

// const fs = require("fs");
// const pdf = require('pdf-parse-new');


// //const axios = require("axios");

// app.set("view engine", "ejs");
// app.set("views", path.join(__dirname, "views"));

// const engine = require('ejs-mate')
// app.engine('ejs', engine);
// app.use(express.static("public"));
// app.use(express.urlencoded({ extended: true }));
// app.use(express.json());



// app.get('/', (req, res) => {
//     res.render("home.ejs");
// });
// app.get('/upload', (req, res) => {
//     res.render("upload.ejs");
// });
// app.post('/upload', upload.single('resume'), async function (req, res, next) {
//     console.log(req.file);
//     const dataBuffer = fs.readFileSync(req.file.path);
//     let resumeText=''
//     pdf(dataBuffer).then(function(data) {
//         console.log(data.numpages);  // Number of pages
//         console.log(data.text);       // Full text content
//         resumeText=data.text;
//         console.log(data.info);       // PDF metadata
//     });
//     // The client gets the API key from the environment variable `GEMINI_API_KEY`.
//     const ai = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY});

//     async function main() {
//     const response = await ai.models.generateContent({
//     model: "gemini-2.0-flash",
//     contents: "Explain how AI works in a few words",
//     });
//     console.log(response.text);
// }

// main();
// });
// app.get('/dashboard', (req, res) => {
//     res.render("dashboard.ejs");
// });
// app.listen(3000, () => {
//     console.log('Server is running on port 3000');
// });
