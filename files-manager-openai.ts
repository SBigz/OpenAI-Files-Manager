import dotenv from "dotenv";
import { createReadStream } from "fs";
import * as readline from "readline";
import { OpenAI } from "openai";

dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is not set in the environment variables");
}

const client = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function uploadFile(): Promise<void> {
  const filename = await question("Enter the filename to upload: ");
  try {
    const response = await client.files.create({
      file: createReadStream(filename),
      purpose: "assistants",
    });
    console.log(response);
    console.log(
      `File uploaded successfully: ${response.filename} [${response.id}]`
    );
  } catch (error) {
    console.error("Error uploading file:", error);
  }
}

async function listFiles(): Promise<void> {
  const response = await client.files.list({ purpose: "assistants" });
  if (response.data.length === 0) {
    console.log("No files found.");
    return;
  }
  for (const file of response.data) {
    const createdDate = new Date(file.created_at * 1000)
      .toISOString()
      .split("T")[0];
    console.log(`${file.filename} [${file.id}], Created: ${createdDate}`);
  }
}

async function listAndDeleteFile(): Promise<void> {
  while (true) {
    const response = await client.files.list({ purpose: "assistants" });
    const files = response.data;
    if (files.length === 0) {
      console.log("No files found.");
      return;
    }
    files.forEach((file, index) => {
      const createdDate = new Date(file.created_at * 1000)
        .toISOString()
        .split("T")[0];
      console.log(
        `[${index + 1}] ${file.filename} [${file.id}], Created: ${createdDate}`
      );
    });
    const choice = await question(
      "Enter a file number to delete, or any other input to return to menu: "
    );
    if (
      !/^\d+$/.test(choice) ||
      parseInt(choice) < 1 ||
      parseInt(choice) > files.length
    ) {
      return;
    }
    const selectedFile = files[parseInt(choice) - 1];
    await client.files.del(selectedFile.id);
    console.log(`File deleted: ${selectedFile.filename}`);
  }
}

async function deleteAllFiles(): Promise<void> {
  const confirmation = await question(
    "This will delete all OpenAI files with purpose 'assistants'.\nType 'YES' to confirm: "
  );
  if (confirmation === "YES") {
    const response = await client.files.list({ purpose: "assistants" });
    for (const file of response.data) {
      await client.files.del(file.id);
    }
    console.log("All files with purpose 'assistants' have been deleted.");
  } else {
    console.log("Operation cancelled.");
  }
}

async function main(): Promise<void> {
  while (true) {
    console.log("\n== Assistants file utility ==");
    console.log("[1] Upload file");
    console.log("[2] List all files");
    console.log("[3] List all and delete one of your choice");
    console.log("[4] Delete all assistant files (confirmation required)");
    console.log("[9] Exit");
    const choice = await question("Enter your choice: ");
    switch (choice) {
      case "1":
        await uploadFile();
        break;
      case "2":
        await listFiles();
        break;
      case "3":
        await listAndDeleteFile();
        break;
      case "4":
        await deleteAllFiles();
        break;
      case "9":
        rl.close();
        return;
      default:
        console.log("Invalid choice. Please try again.");
    }
  }
}

main().catch(console.error);
