#!/usr/bin/env node

import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";
import inquirer from "inquirer";

async function convertLottieToSVG(lottieFilePath: string, outputDir: string) {
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

  await browser.close();
}

async function main() {
  const args = process.argv.slice(2);

  let lottieFilePath: string, outputDir: string;

  if (args.length === 2) {
    lottieFilePath = args[0];
    outputDir = args[1];
  } else {
    console.log("( ˙灬˙ ) Welcome to lottie-converter!")
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
    ]);

    lottieFilePath = answers.lottieFilePath;
    outputDir = answers.outputDir;
  }

  try {
    await convertLottieToSVG(lottieFilePath, outputDir);
    console.log(
      "\n\x1b[1m\x1b[34m!\x1b[0m\x1b[1m All frames converted!\x1b[0m"
    );
  } catch (err) {
    console.error("Conversion failed:", err);
  }
}

main();
