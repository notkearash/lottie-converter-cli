# lottie-converter-js

## Getting Started

First you have to install the dependecies:

```bash
npm install
```
After getting finished with installing the dependencies you can either build the project:
```bash
npm run build
```
> _Or_ have a glance with `npm run dev`


## Usage:

There are several ways that you can run this project:

### Run interactively 

```bash
npx lottie-converter
```

### Run with command-line arguments 

```bash
npx lottie-converter <lottieFilePath> <outputDir>
```

### Convert from TGS to SVG:
```bash
gzip -dc AnimatedSticker.tgs | npx lottie-converter - out/
```

## Note:

You can already convert the SVG output to a mp4 formatted video using:

```bash
npm run convert:mp4
```
Which is locked to 60 frames per second. You can change the FPS by copying this command into your terminal:

```bash
# Note: `1 < $FPS < 240`
ffmpeg -r 240 -width 512 -height 512 -i out/%d.svg -c:v libx264 -r $FPS out.mp4 -y
```
