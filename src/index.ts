#!/usr/bin/env node

import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";
import inquirer from "inquirer";
import { exec } from "child_process";

process.on("SIGINT", () => process.exit(0));

async function convertLottieToSVG(
  lottieFilePath: string,
  outputDir: string,
  convertToMP4: boolean
) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  let animationData = JSON.parse(fs.readFileSync(lottieFilePath, "utf8"));

  const lottiePath = path.join(__dirname, "lib", "lottie_svg.min.js");
  const lottieScript = await fs.promises.readFile(lottiePath, "utf8");

  await page.setContent(`
        <!DOCTYPE html>
        <html lang="en">
        <head><meta charset="UTF-8"></head>
        <body><div id="animation"></div></body>
        <script>${lottieScript}</script>
        <script>
            var animation = bodymovin.loadAnimation({
                container: document.getElementById('animation'),
                renderer: 'svg',
                loop: false,
                autoplay: false,
                animationData: ${JSON.stringify(animationData)}
            });
        </script>
        </html>
    `);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const totalFrames = animationData.op - animationData.ip;

  for (let frame = 0; frame < totalFrames * 4; frame++) {
    await page.evaluate((frame) => {
      (window as any).animation.goToAndStop(frame / 4, true);
    }, frame);

    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(resolve))
    );

    const svgData = await page.evaluate(() => {
      return (document.getElementById("animation") as HTMLElement).innerHTML;
    });

    const outputFilePath = path.join(outputDir, `${frame}.svg`);
    await fs.promises.writeFile(outputFilePath, svgData);
  }

  if (convertToMP4) {
    await convertSVGsToMP4(outputDir);
  }

  await browser.close();
}

async function convertSVGsToMP4(outputDir: string) {
  return new Promise<void>((resolve, reject) => {
    const ffmpegCommand = `ffmpeg -r 240 -width 512 -height 512 -i ${path.join(
      outputDir,
      "%d.svg"
    )} -c:v libx264 -r 60 ${path.join(outputDir, "out.mp4")} -y`;

    exec(ffmpegCommand, (error, stdout) => {
      if (error) {
        console.error(`=== ERROR DURING CONVERSION ===\n${error.message}`);
        return reject(error);
      }
      console.log(stdout);
      resolve();
    });
  });
}

async function validateInputs(lottieFilePath: string, outputDir: string) {
  try {
    await fs.promises.access(lottieFilePath, fs.constants.F_OK);
  } catch {
    throw new Error(`\n\x1b[31m!\x1b[0m Lottie file not found: ${lottieFilePath}`);
  }

  try {
    const data = await fs.promises.readFile(lottieFilePath, "utf8");
    JSON.parse(data);
  } catch (err) {
    throw new Error(`\n\x1b[31m!\x1b[0m Invalid Lottie JSON: ${(err as Error).message}`);
  }

  try {
    await fs.promises.access(outputDir, fs.constants.F_OK);
  } catch {
    await fs.promises.mkdir(outputDir, { recursive: true });
  }
}

async function main() {
  const args = process.argv.slice(2);

  let lottieFilePath: string,
    outputDir: string,
    convertToMP4 = false;

  if (args.length === 2) {
    lottieFilePath = args[0];
    outputDir = args[1];
  } else {
    console.log("\x1b[33m( ˙灬˙ )\x1b[0m Welcome to lottie-converter!");
    const answers = await inquirer.prompt([
      {
        type: "input",
        name: "lottieFilePath",
        message: "Enter the Lottie file path:",
        validate: (input: string) =>
          input ? true : "Lottie file path is required.",
      },
      {
        type: "input",
        name: "outputDir",
        message: "Enter the output directory:",
        validate: (input: string) =>
          input ? true : "Output directory is required.",
      },
      {
        type: "confirm",
        name: "convertToMP4",
        message: "Do you want to convert the frames to MP4?",
        default: false,
      },
    ]);

    console.log("\x1b[33m( ^灬^ )\x1b[0m Converting..!");

    lottieFilePath = answers.lottieFilePath;
    outputDir = answers.outputDir;
    convertToMP4 = answers.convertToMP4;
  }

  try {
    await validateInputs(lottieFilePath, outputDir);
    await convertLottieToSVG(lottieFilePath, outputDir, convertToMP4);
    console.log(
      "\n\x1b[1m\x1b[34m!\x1b[0m\x1b[1m All frames converted!\x1b[0m"
    );
  } catch (err) {
    console.error("\x1b[31m( x灬x )\x1b[0m Conversion failed:", err);
  }
}

main();
