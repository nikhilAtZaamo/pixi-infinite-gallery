// imports

import * as PIXI from "pixi.js";
// import stageFragmentShader from "./shader/stage-shader.glsl?raw";
import { BulgePinchFilter } from "@pixi/filter-bulge-pinch";

// global vars;

const GRID_COLS = 10;
const GRID_ROWS = 10;
const GRID_CELL_HEIGHT = 500 * 0.7;
const GRID_CELL_WIDTH = 300 * 0.7;
const GRID_PADDING = 10;

export default class Sketch {
  constructor(view) {
    this.view = view;

    // initial vars
    this.pointerDownTarget = 0;
    this.pointerInitialPos = { x: 0, y: 0 };
    this.pointerCurrentPos = { x: 0, y: 0 };
    this.scroll = {
      deltaX: 0,
      deltaY: 0,
    };

    this.loadCount = 0;

    // init dimensions
    this.initDimensions();

    // init uniforms
    this.initUniforms();

    // init grid
    this.initGrid();

    // init app
    this.initApp();

    // init container
    this.initContainer();

    // init rects and images
    this.initRectsAndImages();

    // init events
    this.initEvents();

    // init renderer
    this.initRenderer();
  }

  initDimensions() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.diffX = 0;
    this.diffY = 0;
  }

  initUniforms() {
    this.uniforms = {
      uResolution: new PIXI.Point(this.width, this.height),
      uPointerDown: this.pointerDownTarget,
    };
  }

  initGrid() {
    this.gridColumnsCount = GRID_COLS;
    this.gridRowsCount = GRID_ROWS;
    this.gridCellWidth = GRID_CELL_WIDTH;
    this.gridCellHeight = GRID_CELL_HEIGHT;
    this.gridPadding = GRID_PADDING;

    this.gridWidth = this.gridColumnsCount * this.gridCellWidth;
    this.gridHeight = this.gridRowsCount * this.gridCellHeight;

    this.gridColCountView = Math.ceil(this.width / this.gridCellWidth);
    this.gridRowCountView = Math.ceil(this.height / this.gridCellHeight);

    this.widthRest = Math.ceil(
      this.gridColCountView * this.gridCellWidth - this.width
    );
    this.heightRest = Math.ceil(
      this.gridRowCountView * this.gridCellHeight - this.height
    );

    this.centerX = this.width / 2;
    this.centerY = this.height / 2;

    this.rects = [];

    // rect = {x, y, w, h}
    for (let i = 0; i < this.gridColumnsCount; i++) {
      for (let j = 0; j < this.gridRowsCount; j++) {
        let rect = {
          x: i * this.gridCellWidth,
          y: j * this.gridCellHeight,
          w: this.gridCellWidth,
          h: this.gridCellHeight,
        };
        this.rects.push(rect);
      }
    }

    this.images = [];
    this.texts = [];
    this.imageUrls = {};
  }

  initApp() {
    // create a PIXIJS application
    this.app = new PIXI.Application({ view: this.view });

    // resizes renderer view in CSS pixels to allow for resolution independence
    this.app.renderer.autoDensity = true;
    this.app.renderer.resize(this.width, this.height);

    this.bulgePinchFilter = new BulgePinchFilter({
      // center: new PIXI.Point(this.centerX, this.centerY),
      radius: Math.sqrt(
        (this.width * this.width + this.height * this.height) * 0.4
      ),
      strength: 0,
    });

    // const stageFilter = new PIXI.Filter(
    //   undefined,
    //   stageFragmentShader,
    //   this.uniforms
    // );
    this.app.stage.filters = [this.bulgePinchFilter];
  }

  initContainer() {
    this.container = new PIXI.Container();
    this.app.stage.addChild(this.container);
  }

  initRectsAndImages() {
    // create a new Graphics element to draw solid rectangles
    this.graphics = new PIXI.Graphics();
    // select color
    this.graphics.beginFill(0x000000);

    // loop through all rects
    this.rects.forEach((rect) => {
      // create a new Sprite element for each image
      const image = new PIXI.Sprite();

      // set image dimensions
      image.width = rect.w - this.gridPadding;
      image.height = rect.h - this.gridPadding;
      image.x = rect.x;
      image.y = rect.y;

      // set image alpha 0 to hide it initially
      image.alpha = 0;

      // add image to the list
      this.images.push(image);

      //  create a random text saying "Collection - Random"
      const randomNumber = Math.floor(Math.random() * 1000);

      const text = new PIXI.Text(`Collection - ${randomNumber}`, {
        fontFamily: "Arial",
        fontSize: 16,
        fill: "white",
        dropShadow: true,
        dropShadowColor: "black",
        dropShadowBlur: 4,
        dropShadowAngle: Math.PI / 6,
        dropShadowDistance: 4,
      });

      text.x = image.x;
      text.y = image.y + image.height - text.height;
      text.alpha = 0;
      text.resolution = 2;

      this.texts.push(text);

      // draw the rectangle
      this.graphics.drawRect(image.x, image.y, image.width, image.height);
    });

    this.graphics.endFill();

    // add to container
    this.container.addChild(this.graphics);

    // add images to container
    this.images.forEach((image) => {
      this.container.addChild(image);
    });

    // add texts to container
    this.texts.forEach((text) => {
      this.container.addChild(text);
    });
  }

  initEvents() {
    // this.isInitialClick = false;

    // make stage interactive
    this.app.stage.interactive = true;

    // add event listeners
    this.app.stage
      .on("pointerdown", this.onPointerDown.bind(this))
      .on("pointerup", this.onPointerUp.bind(this))
      .on("pointermove", this.onPointerMove.bind(this))
      .on("pointerupoutside", this.onPointerUp.bind(this));
  }

  initRenderer() {
    this.app.ticker.add(() => {
      this.checkRectsAndImages();

      this.uniforms.uPointerDown +=
        (this.pointerDownTarget - this.uniforms.uPointerDown) * 0.045;

      if (this.uniforms.uPointerDown > 0.3) {
        this.uniforms.uPointerDown = 0.3;
      }

      this.bulgePinchFilter.strength = this.uniforms.uPointerDown;

      if (this.scroll.deltaX !== 0 || this.scroll.deltaY !== 0) {
        if (
          this.scroll.deltaX < 1 &&
          this.scroll.deltaX > -1 &&
          this.scroll.deltaY < 1 &&
          this.scroll.deltaY > -1
        ) {
          this.scroll.deltaX = 0;
          this.scroll.deltaY = 0;
          return;
        }

        this.scroll.deltaX *= 0.95;
        this.scroll.deltaY *= 0.95;
      }

      // this.container.x += this.scroll.deltaX;
      // this.container.y += this.scroll.deltaY;

      for (let i = 0; i < this.images.length; i++) {
        const pos = this.images[i].position;

        const { x, y } = this._calcPos(this.scroll, pos);

        this.images[i].position.x = x;
        this.images[i].position.y = y;

        this.texts[i].position.x = x;
        this.texts[i].position.y =
          y + this.images[i].height - this.texts[i].height;
      }
    });
  }

  _calcPos(scroll, pos) {
    let newPosX =
      ((pos.x +
        scroll.deltaX +
        this.gridWidth +
        this.gridCellWidth +
        this.gridPadding) %
        this.gridWidth) -
      this.gridCellWidth -
      this.gridPadding;

    let newPosY =
      ((pos.y +
        scroll.deltaY +
        this.gridHeight +
        this.gridCellHeight +
        this.gridPadding) %
        this.gridHeight) -
      this.gridCellHeight -
      this.gridPadding;

    return {
      x: newPosX,
      y: newPosY,
    };
  }

  onPointerDown(e) {
    this.pointerDownTarget = 1;
    const { x, y } = e.data.global;
    this.pointerInitialPos = { x, y };
  }

  onPointerUp(e) {
    this.pointerDownTarget = 0;
  }

  onPointerMove(e) {
    if (!this.pointerDownTarget) return;

    const { x, y } = e.data.global;

    this.pointerCurrentPos = { x, y };

    const deltaX = this.pointerCurrentPos.x - this.pointerInitialPos.x;

    const deltaY = this.pointerCurrentPos.y - this.pointerInitialPos.y;

    this.scroll.deltaX = deltaX / 5;
    this.scroll.deltaY = deltaY / 5;
  }

  checkRectsAndImages() {
    for (let index = 0; index < this.rects.length; index++) {
      const rect = this.rects[index];
      const image = this.images[index];
      const text = this.texts[index];

      if (this.loadCount < this.rects.length) {
        this.loadCount++;
        this.loadTextureForImage(index);
      }

      if (rect.loaded && image.alpha < 1) {
        image.alpha += 0.01;
        text.alpha += 0.01;

        if (!image.interactive) {
          image.interactive = true;
          image.on("pointerdown", this.onImageClick.bind(this));
        }
      }
    }
  }

  onImageClick(e) {
    console.log(e);
  }

  loadTextureForImage(index) {
    // Get image Sprite
    const image = this.images[index];
    // Set the url to get a random image from Unsplash Source, given image dimensions
    const url = `https://robohash.org/set_set3/bgset_bg1/robo-${index}?size=${image.width}x${image.height}`;
    // Get the corresponding rect, to store more data needed (it is a normal Object)
    const rect = this.rects[index];
    // Fetch the image
    fetch(url)
      .then((response) => {
        image.texture = PIXI.Texture.from(response.url);
        rect.loaded = true;
      })
      .catch(() => {
        // Catch errors silently, for not showing the following error message if it is aborted:
        // AbortError: The operation was aborted.
      });
  }
}
