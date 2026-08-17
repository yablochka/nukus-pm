const express = require("express");
const cors = require("cors");
const multer = require("multer");
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const app = express();

// ======================================================
// CONFIG
// ======================================================

const PORT = process.env.PORT || 8000;

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
// MIDDLEWARE
// ======================================================

app.use(cors());
app.use(express.json());

// The cPanel Node app is mounted at /news.
// Keep uploaded files under the same public URL prefix.
app.use("/news/uploads", express.static(path.join(__dirname, "uploads")));

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
        url: `/news/uploads/news/${image.filename}`,
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

// ======================================================
// ROOT
// ======================================================

app.get("/", (req, res) => {
    res.json({
        message: "Nukus Prezident maktabi News API ishlayapti"
    });
});

// ======================================================
// CREATE NEWS
// ======================================================

app.post("/news", upload.array("images", 20), (req, res) => {
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
            return res.status(400).json({
                detail: "Barcha maydonlarni to'ldiring"
            });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                detail: "Kamida bitta rasm yuklang"
            });
        }

        const mainIndex = Number(main_image_index ?? 0);

        if (
            !Number.isInteger(mainIndex) ||
            mainIndex < 0 ||
            mainIndex >= req.files.length
        ) {
            removeFiles(req.files);
            return res.status(400).json({
                detail: "Asosiy rasm indexi noto'g'ri"
            });
        }

        const createNews = db.transaction(() => {
            const result = db.prepare(`
                INSERT INTO news (
                    title,
                    short_description,
                    content,
                    date
                )
                VALUES (?, ?, ?, ?)
            `).run(
                title,
                short_description,
                content,
                news_date
            );

            const newsId = result.lastInsertRowid;

            const insertImage = db.prepare(`
                INSERT INTO news_images (
                    news_id,
                    filename,
                    is_main,
                    position
                )
                VALUES (?, ?, ?, ?)
            `);

            req.files.forEach((file, index) => {
                insertImage.run(
                    newsId,
                    file.filename,
                    index === mainIndex ? 1 : 0,
                    index
                );
            });

            return newsId;
        });

        const newsId = createNews();

        res.status(201).json(getNewsById(newsId));
    } catch (error) {
        removeFiles(req.files);
        console.error(error);
        res.status(500).json({
            detail: "Yangilik yaratishda xatolik"
        });
    }
});

// ======================================================
// GET ALL NEWS
// ======================================================

app.get("/news", (req, res) => {
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
        res.status(500).json({
            detail: "Yangiliklarni olishda xatolik"
        });
    }
});

// ======================================================
// GET ONE NEWS
// ======================================================

app.get("/news/:id", (req, res) => {
    try {
        const id = Number(req.params.id);
        const news = getNewsById(id);

        if (!news) {
            return res.status(404).json({
                detail: "Yangilik topilmadi"
            });
        }

        res.json(news);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            detail: "Yangilikni olishda xatolik"
        });
    }
});

// ======================================================
// UPDATE NEWS
// ======================================================

app.put("/news/:id", upload.array("images", 20), (req, res) => {
    try {
        const id = Number(req.params.id);

        const news = db.prepare(`
            SELECT *
            FROM news
            WHERE id = ?
        `).get(id);

        if (!news) {
            removeFiles(req.files);
            return res.status(404).json({
                detail: "Yangilik topilmadi"
            });
        }

        const {
            title,
            short_description,
            content,
            news_date,
            main_image_index
        } = req.body;

        if (!title || !short_description || !content || !news_date) {
            removeFiles(req.files);
            return res.status(400).json({
                detail: "Barcha maydonlarni to'ldiring"
            });
        }

        if (req.files && req.files.length > 0) {
            const mainIndex = Number(main_image_index ?? 0);

            if (
                !Number.isInteger(mainIndex) ||
                mainIndex < 0 ||
                mainIndex >= req.files.length
            ) {
                removeFiles(req.files);
                return res.status(400).json({
                    detail: "Asosiy rasm indexi noto'g'ri"
                });
            }

            const oldImages = db.prepare(`
                SELECT filename
                FROM news_images
                WHERE news_id = ?
            `).all(id);

            const replaceNewsImages = db.transaction(() => {
                db.prepare(`
                    UPDATE news
                    SET
                        title = ?,
                        short_description = ?,
                        content = ?,
                        date = ?
                    WHERE id = ?
                `).run(
                    title,
                    short_description,
                    content,
                    news_date,
                    id
                );

                db.prepare(`
                    DELETE FROM news_images
                    WHERE news_id = ?
                `).run(id);

                const insertImage = db.prepare(`
                    INSERT INTO news_images (
                        news_id,
                        filename,
                        is_main,
                        position
                    )
                    VALUES (?, ?, ?, ?)
                `);

                req.files.forEach((file, index) => {
                    insertImage.run(
                        id,
                        file.filename,
                        index === mainIndex ? 1 : 0,
                        index
                    );
                });
            });

            replaceNewsImages();

            for (const image of oldImages) {
                const filePath = path.join(UPLOAD_DIR, image.filename);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }
        } else {
            db.prepare(`
                UPDATE news
                SET
                    title = ?,
                    short_description = ?,
                    content = ?,
                    date = ?
                WHERE id = ?
            `).run(
                title,
                short_description,
                content,
                news_date,
                id
            );
        }

        res.json(getNewsById(id));
    } catch (error) {
        removeFiles(req.files);
        console.error(error);
        res.status(500).json({
            detail: "Yangilikni yangilashda xatolik"
        });
    }
});

// ======================================================
// DELETE NEWS
// ======================================================

app.delete("/news/:id", (req, res) => {
    try {
        const id = Number(req.params.id);

        const news = db.prepare(`
            SELECT *
            FROM news
            WHERE id = ?
        `).get(id);

        if (!news) {
            return res.status(404).json({
                detail: "Yangilik topilmadi"
            });
        }

        const images = db.prepare(`
            SELECT filename
            FROM news_images
            WHERE news_id = ?
        `).all(id);

        db.prepare(`
            DELETE FROM news
            WHERE id = ?
        `).run(id);

        for (const image of images) {
            const filePath = path.join(UPLOAD_DIR, image.filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        res.json({
            message: "Yangilik o'chirildi"
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            detail: "Yangilikni o'chirishda xatolik"
        });
    }
});

// ======================================================
// ERROR HANDLER
// ======================================================

app.use((error, req, res, next) => {
    console.error(error);

    if (error instanceof multer.MulterError) {
        return res.status(400).json({
            detail: error.message
        });
    }

    return res.status(500).json({
        detail: error.message || "Server xatosi"
    });
});

// ======================================================
// SERVER
// ======================================================

app.listen(PORT, () => {
    console.log(`🚀 Server: http://localhost:${PORT}`);
    console.log(`📚 API: http://localhost:${PORT}/news`);
});
