import mongoose, { Mongoose } from "mongoose";
import { type } from "os";

const projectSchema = new mongoose.Schema({
    prompts: {

    },
    name: {
        type: String,
        required: [true, 'name is required'],
        trim: true,
        maxlength: [50, 'name cannot exceed 50 characters']
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    description: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        default: "pending",
        enum: ['pending', 'completed', 'deployed'],
    },
    deployedURL: {
        type: String
    },
    requirments: {
        type: mongoose.Schema.Types.Mixed,
        default: []
    },
    stringStucture: {
        type: String,
        default: `
  ├── .github/
  ├── .git/
  ├── .next/
  ├── .qodo/
  ├── public/
  │   ├── file.svg
  │   ├── globe.svg
  │   ├── next.svg
  │   ├── vercel.svg
  │   └── window.svg
  ├── src/
  │   └── app/
  │       ├── favicon.ico
  │       ├── globals.css
  │       ├── layout.js
  │       ├── page.js
  │       └── page.module.css
  ├── .gitignore
  ├── eslint.config.mjs
  ├── jsconfig.json
  ├── next.config.mjs
  ├── package-lock.json
  ├── package.json
  ├── postcss.config.mjs
  └── README.md`
    },
    previewURL: String
}, {
    timestamps: true
})


export default   mongoose.model('Project', projectSchema);


