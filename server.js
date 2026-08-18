const express = require("express");
const cors = require("cors");
const multer = require("multer");
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const app = express();

const PORT = process.env.PORT || 8000;
const PUBLIC_API_ORIGIN = process.env.PUBLIC_API_ORIGIN || "https://nukusps.uz";
const UPLOAD_DIR = path.join(__dirname, "uploads", "news");

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ======================================================
// DATABASE
// ======================================================

const db = new Database(path.join(__dirname, "news.db"));
db.pragma("foreign_keys = ON");

db.exec(`
    CREATE TABLE IF NOT EXISTS news (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        short_description TEXT NOT NULL,
        content TEXT NOT NULL,
        date TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS news_images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        news_id INTEGER NOT NULL,
        filename TEXT NOT NULL,
        is_main INTEGER NOT NULL DEFAULT 0,
        position INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (news_id)
            REFERENCES news(id)
            ON DELETE CASCADE
    );
`);

// ======================================================
// CORS / MIDDLEWARE
// ======================================================

const allowedOrigins = new Set([
    "https://nukuspmweb.netlify.app",
    "https://nukusps.uz",
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173"
]);

app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.has(origin)) {
            return callback(null, true);
        }
        return callback(new Error("CORS origin not allowed"));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
    optionsSuccessStatus: 204
}));

app.use((req, res, next) => {
    const origin = req.headers.origin;

    if (origin && allowedOrigins.has(origin)) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Vary", "Origin");
    }

    res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS"
    );
    res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, Accept"
    );

    if (req.method === "OPTIONS") {
        return res.sendStatus(204);
    }

    next();
});

app.use(express.json());

// cPanel/Passenger may expose the application under /api/news.
// These aliases make uploads work whether Passenger keeps or strips the base URI.
app.use(
    ["/api/news/uploads", "/news/uploads", "/uploads"],
    express.static(path.join(__dirname, "uploads"))
);

// ======================================================
// MULTER
// ======================================================

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        const extension = path.extname(file.originalname).toLowerCase();
        cb(null, `${crypto.randomUUID()}${extension}`);
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) {
            cb(null, true);
        } else {
            cb(new Error("Faqat rasm fayllari yuklash mumkin"));
        }
    },
    limits: {
        files: 20,
        fileSize: 10 * 1024 * 1024
    }
});

// ======================================================
// HELPERS
// ======================================================

function getNewsImages(newsId) {
    const images = db.prepare(`
        SELECT id, filename, is_main, position
        FROM news_images
        WHERE news_id = ?
        ORDER BY position ASC
    `).all(newsId);

    return images.map((image) => ({
        id: image.id,
        filename: image.filename,
        url: `${PUBLIC_API_ORIGIN}/api/news/uploads/news/${image.filename}`,
        is_main: Boolean(image.is_main),
        position: image.position
    }));
}

function getNewsById(id) {
    const news = db.prepare(`
        SELECT id, title, short_description, content, date
        FROM news
        WHERE id = ?
    `).get(id);

    if (!news) return null;

    return {
        ...news,
        images: getNewsImages(id)
    };
}

function removeFiles(files) {
    for (const file of files || []) {
        if (file?.path && fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
        }
    }
}

function parseId(value) {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
}

// ======================================================
// NEWS ROUTER
// ======================================================

const newsRouter = express.Router();

newsRouter.get("/", (req, res) => {
    try {
        const newsList = db.prepare(`
            SELECT id, title, short_description, content, date
            FROM news
            ORDER BY date DESC, id DESC
        `).all();

        res.json(newsList.map((news) => ({
            ...news,
            images: getNewsImages(news.id)
        })));
    } catch (error) {
        console.error(error);
        res.status(500).json({ detail: "Yangiliklarni olishda xatolik" });
    }
});

newsRouter.get("/:id", (req, res) => {
    try {
        const id = parseId(req.params.id);

        if (!id) {
            return res.status(400).json({ detail: "Yangilik ID noto'g'ri" });
        }

        const news = getNewsById(id);

        if (!news) {
            return res.status(404).json({ detail: "Yangilik topilmadi" });
        }

        res.json(news);
    } catch (error) {
        console.error(error);
        res.status(500).json({ detail: "Yangilikni olishda xatolik" });
    }
});

newsRouter.post("/", upload.array("images", 20), (req, res) => {
    try {
        const {
            title,
            short_description,
            content,
            news_date,
            main_image_index
        } = req.body;

        if (!title || !short_description || !content || !news_date) {
            removeFiles(req.files);
            return res.status(400).json({ detail: "Barcha maydonlarni to'ldiring" });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ detail: "Kamida bitta rasm yuklang" });
        }

        const mainIndex = Number(main_image_index ?? 0);

        if (
            !Number.isInteger(mainIndex) ||
            mainIndex < 0 ||
            mainIndex >= req.files.length
        ) {
            removeFiles(req.files);
            return res.status(400).json({ detail: "Asosiy rasm indexi noto'g'ri" });
        }

        const createNews = db.transaction(() => {
            const result = db.prepare(`
                INSERT INTO news (title, short_description, content, date)
                VALUES (?, ?, ?, ?)
            `).run(title, short_description, content, news_date);

            const newsId = result.lastInsertRowid;

            const insertImage = db.prepare(`
                INSERT INTO news_images (news_id, filename, is_main, position)
                VALUES (?, ?, ?, ?)
            `);

            req.files.forEach((file, index) => {
                insertImage.run(newsId, file.filename, index === mainIndex ? 1 : 0, index);
            });

            return newsId;
        });

        res.status(201).json(getNewsById(createNews()));
    } catch (error) {
        removeFiles(req.files);
        console.error(error);
        res.status(500).json({ detail: "Yangilik yaratishda xatolik" });
    }
});

newsRouter.put("/:id", upload.array("images", 20), (req, res) => {
    try {
        const id = parseId(req.params.id);

        if (!id) {
            removeFiles(req.files);
            return res.status(400).json({ detail: "Yangilik ID noto'g'ri" });
        }

        const news = db.prepare(`SELECT * FROM news WHERE id = ?`).get(id);

        if (!news) {
            removeFiles(req.files);
            return res.status(404).json({ detail: "Yangilik topilmadi" });
        }

        const { title, short_description, content, news_date, main_image_index } = req.body;

        if (!title || !short_description || !content || !news_date) {
            removeFiles(req.files);
            return res.status(400).json({ detail: "Barcha maydonlarni to'ldiring" });
        }

        if (req.files && req.files.length > 0) {
            const mainIndex = Number(main_image_index ?? 0);

            if (
                !Number.isInteger(mainIndex) ||
                mainIndex < 0 ||
                mainIndex >= req.files.length
            ) {
                removeFiles(req.files);
                return res.status(400).json({ detail: "Asosiy rasm indexi noto'g'ri" });
            }

            const oldImages = db.prepare(`
                SELECT filename FROM news_images WHERE news_id = ?
            `).all(id);

            const replaceNews = db.transaction(() => {
                db.prepare(`
                    UPDATE news
                    SET title = ?, short_description = ?, content = ?, date = ?
                    WHERE id = ?
                `).run(title, short_description, content, news_date, id);

                db.prepare(`DELETE FROM news_images WHERE news_id = ?`).run(id);

                const insertImage = db.prepare(`
                    INSERT INTO news_images (news_id, filename, is_main, position)
                    VALUES (?, ?, ?, ?)
                `);

                req.files.forEach((file, index) => {
                    insertImage.run(id, file.filename, index === mainIndex ? 1 : 0, index);
                });
            });

            replaceNews();

            for (const image of oldImages) {
                const filePath = path.join(UPLOAD_DIR, image.filename);
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            }
        } else {
            db.prepare(`
                UPDATE news
                SET title = ?, short_description = ?, content = ?, date = ?
                WHERE id = ?
            `).run(title, short_description, content, news_date, id);
        }

        res.json(getNewsById(id));
    } catch (error) {
        removeFiles(req.files);
        console.error(error);
        res.status(500).json({ detail: "Yangilikni yangilashda xatolik" });
    }
});

newsRouter.delete("/:id", (req, res) => {
    try {
        const id = parseId(req.params.id);

        if (!id) {
            return res.status(400).json({ detail: "Yangilik ID noto'g'ri" });
        }

        const news = db.prepare(`SELECT * FROM news WHERE id = ?`).get(id);

        if (!news) {
            return res.status(404).json({ detail: "Yangilik topilmadi" });
        }

        const images = db.prepare(`
            SELECT filename FROM news_images WHERE news_id = ?
        `).all(id);

        db.prepare(`DELETE FROM news WHERE id = ?`).run(id);

        for (const image of images) {
            const filePath = path.join(UPLOAD_DIR, image.filename);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }

        res.json({ message: "Yangilik o'chirildi" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ detail: "Yangilikni o'chirishda xatolik" });
    }
});

// Public API is /api/news.
// /news is kept as a compatibility alias while the site is migrated.
// Mounting at / also makes the API work when cPanel Passenger strips its BaseURI.
app.use("/api/news", newsRouter);
app.use("/news", newsRouter);
app.use("/", newsRouter);

app.get("/health", (req, res) => {
    res.json({ status: "ok" });
});

// ======================================================
// ERROR HANDLER
// ======================================================

app.use((error, req, res, next) => {
    console.error(error);

    if (error instanceof multer.MulterError) {
        return res.status(400).json({ detail: error.message });
    }

    if (error.message === "CORS origin not allowed") {
        return res.status(403).json({ detail: "CORS origin not allowed" });
    }

    res.status(500).json({ detail: error.message || "Server xatosi" });
});

app.listen(PORT, () => {
    console.log(`🚀 Server: http://localhost:${PORT}`);
    console.log(`📚 Public API: ${PUBLIC_API_ORIGIN}/api/news`);
});
