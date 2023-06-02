ctx.fillStyle = "black";
ctx.strokeStyle = "white";

const createAxes = (width, height, shape) =>
  tf.tidy(() => ({
    x: tf.keep(tf.range(0, width).tile([height]).reshape(shape).div(width)),
    y: tf.keep(
      tf
        .range(height, 0)
        .reshape([height, 1])
        .tile([1, width])
        .reshape(shape)
        .div(height)
    ),
  }));

const hexToRGB = (hex) => {
  const { groups } = hex
    .toUpperCase()
    .match(/^#?(?<r>[\dA-F]{2})(?<g>[\dA-F]{2})(?<b>[\dA-F]{2})$/);

  return [
    parseInt(groups.r, 16) / 255,
    parseInt(groups.g, 16) / 255,
    parseInt(groups.b, 16) / 255,
  ];
};

const mapToColours = (data, colours) =>
  tf.tidy(() => {
    let coloured = tf.zeros([...data.shape.slice(0, -1), 3]);

    for (let i = 0; i < colours.length; i++) {
      coloured = coloured.where(data.notEqual(i), colours[i]);
    }

    return tf.keep(coloured);
  });

function draw() {
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const width = new Monad(paramConfig.getVal("width"))
    .map((n) => (n > 0 ? n : canvas.width))
    .value();
  const height = new Monad(paramConfig.getVal("height"))
    .map((n) => (n > 0 ? n : canvas.height))
    .value();

  const colours = paramConfig
    .getVal("colours")
    .map((colour) => hexToRGB(colour[0]));

  const shape = [height, width, 1];

  const pixels = tf.tidy(() => {
    const axes = createAxes(width, height, shape);

    switch (paramConfig.getVal("mode")) {
      case "Quadratic":
        return tf.keep(
          axes.y.sub(0.5).greater(axes.x.sub(0.5).pow(2)).cast("float32")
        );
      case "Circle":
        return tf.keep(
          axes.y
            .sub(0.5)
            .pow(2)
            .add(axes.x.sub(0.5).pow(2))
            .less(0.5 ** 2)
            .cast("float32")
        );
      case "Coloured Quadratic":
        return tf.keep(
          mapToColours(
            axes.y
              .sub(axes.x.sub(0.5).pow(2))
              .mul(colours.length)
              .cast("int32"),
            colours
          )
        );
    }
  });

  tf.browser.toPixels(pixels, canvas).then(() => {
    pixels.dispose();
  });
}

window.resizeCallback = draw;

paramConfig.onLoad(draw);

paramConfig.addListener(draw, ["redraw"]);
