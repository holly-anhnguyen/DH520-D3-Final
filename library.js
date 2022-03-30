
/*************** INIT DATASET ***************/
// ngrams - article - *.csv : wordcount of each article from 1 to n
// ngrams - article 1-10.csv : the aggregated word count of n articles 
// article.csv : article metadata

  var article = [];
  //By default show dataset of all articles
  article[0] = d3.csv('dataset/ngrams - article 1-10.csv').then(display);

  // Create working dataset to reference article info
  var articleRef = d3.csv('dataset/article.csv').then(function(data){
    data.forEach(x=>{
      articleRef[x.article_id]={
        'title': x.title,
        'author': x.author
    }
  });

  //Display article title
  var count = 1;
  while (count<11){
    var article = d3.selectAll('.article-select')
    .append('div')
    .append('a')
    .attr('class','article-node')
    .attr('id',count)
    .text(articleRef[count].title);
    count++;
  }

  d3.selectAll('a.article-node').on('click',function(){
    var articleID = d3.select(this).attr("id");
    console.log(articleID);
    if (articleID!=0){
      loadFile('dataset/ngrams - article '+articleID+'.csv');
    } else{
      loadFile('dataset/ngrams - article 1-10.csv');
    }
    
  });
});

function loadFile(file){
  d3.csv(file).then(display);
}

// new bubble chart instance

// function called once promise is resolved and data is loaded from csv
// calls bubble chart function to display inside #vis div
function display(data) {
  var myBubbleChart = bubbleChart();
  myBubbleChart('.visual-container', data);
}

// bubbleChart creation function; instantiate new bubble chart given a DOM element to display it in and a dataset to visualise
function bubbleChart() {
  const width = 900;
  const height = 800;
  const centre = { x: width/2, y: height/2 };   // location to centre the bubbles
  const forceStrength = 0.03; // strength to apply to the position forces

  // these will be set in createNodes and chart functions
  var svg = null;
  var bubbles = null;
  var labels = null;
  var nodes = [];

  // charge is dependent on size of the bubble, so bigger towards the middle
  function charge(d) {
    return Math.pow(d.radius, 2.0) * 0.01;
  }

  // create a force simulation and add forces to it
  const simulation = d3.forceSimulation()
    .force('charge', d3.forceManyBody().strength(charge))
    .force('center', d3.forceCenter(centre.x, centre.y))
    .force('x', d3.forceX().strength(forceStrength).x(centre.x))
    .force('y', d3.forceY().strength(forceStrength).y(centre.y))
    .force('collision', d3.forceCollide().radius(d => d.radius + 1));

  // force simulation starts up automatically, which we don't want as there aren't any nodes yet
  simulation.stop();

  var fillColour;

  function createNodes(rawData) {

    const maxSize = d3.max(rawData, d => +d.count);

    // size bubbles based on area
    const radiusScale = d3.scaleSqrt()
      .domain([0, maxSize])
      .range([0, 80]);

    // set up colour scale  
    fillColour = d3.scaleSequential()
    .domain([1, maxSize])
    .interpolator(d3.interpolateWarm);

    // use map() to convert raw data into node data
    const myNodes = rawData.map(d => ({
      ...d,
      radius: radiusScale(+d.count),
      size: +d.count,
      x: Math.random() * 900,
      y: Math.random() * 700
    }));

    return myNodes;
  }

  var chart = function chart(selector, rawData) {
    // convert raw data into nodes data
    nodes = createNodes(rawData);
    //clear all svg before drawing
    d3.selectAll("svg").remove();

    // create svg element inside provided selector
    svg = d3.select(selector)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    // bind nodes data to circle elements
    const elements = svg.selectAll('.bubble')
      .data(nodes, d => d.ngram)
      .enter()
      .append('g');

    bubbles = elements
      .append('circle')
      .classed('bubble', true)
      .attr('r', d => d.radius)
      .attr('fill', d => fillColour(d.size));

    // labels
    labels = elements
      .append('text')
      .attr('dy', '.3em')
      .style('text-anchor', 'middle')
      .append("tspan")
      .text(d => d.ngram + ' ' + d.size);    

    // drawColorLegend(fillColour);

    // set simulation's nodes to our newly created nodes array
    // simulation starts running automatically once nodes are set
    simulation.nodes(nodes)
      .on('tick', ticked)
      .restart();  
  }


  // callback function called after every tick of the force simulation
  // here we do the actual repositioning of the circles based on current x and y value of their bound node data
  // x and y values are modified by the force simulation
  function ticked() {
    bubbles
      .attr('cx', d => d.x)
      .attr('cy', d => d.y);

    labels
      .attr('x', d => d.x)
      .attr('y', d => d.y);
  }

  // return chart function from closure
  return chart;
}

/**************** DRAW LEGEND ********************/

// https://beta.observablehq.com/@tmcw/d3-scalesequential-continuous-color-legend-example
function drawColorLegend(colorSwatch) {
  const legendWidth = 200;
  const legendHeight = 20;
  const scales = {
    // x: d3.scaleLinear(),
    // y: d3.scaleLinear(),
    // do not linearly scale radius...
    // area = pi * r * r, so use sqrt of r!
    // r: d3.scaleSqrt(),
    fill: colorSwatch
  };

  // place legend in its own group
  const group = d3.selectAll(".legend").append('g').attr('id', 'color-legend');

  // shift legend to appropriate position
  group.attr('transform', 'translate(0,0)');

  const title = group.append('text')
    .attr('class', 'axis-title')
    .text('Legend:');

  title.attr('dy', 12);

  // lets draw the rectangle, but it won't have a fill just yet
  const colorbox = group.append('rect')
    .attr('x', 0)
    .attr('y', 18)
    .attr('width', legendWidth)
    .attr('height', legendHeight);

  // we need to create a linear gradient for our color legend
  // this defines a color at a percent offset
  // https://developer.mozilla.org/en-US/docs/Web/SVG/Element/linearGradient

  // this is easier if we create a scale to map our colors to percents

  // get the domain first (we do not want the middle value from the diverging scale)
  const colorDomain = [d3.min(colorSwatch.domain()), d3.max(colorSwatch.domain())];
  console.log(colorDomain);
  // add a new scale to go from color tick to percent
  scales.percent = d3.scaleLinear()
    .range([0, 100])
    .domain(colorSwatch);

  // we have to first add gradients
  const defs = d3.selectAll(".legend").append('defs');

  // add a color stop per data tick
  // input  (ticks)   : [-20, ..., 15, ..., 50]
  // output (percents): [  0, ..., 50, ..., 100]
  defs.append('linearGradient')
    .attr('id', 'gradient2')
    .selectAll('stop')
    .data(scales.fill.ticks(200))
    .enter()
    .append('stop')
    .attr('offset', d => scales.percent(d) + '%')
    .attr('stop-color', d => scales.fill(d));

  // draw the color rectangle with the gradient
  colorbox.attr('fill', 'url(#gradient2)');

  // now we need to draw tick marks for our scale
  // we can create a legend that will map our data domain to the legend colorbox
  scales.legend = d3.scaleLinear()
    .domain(colorDomain)
    .range([0, legendWidth]);

  // i tend to keep scales global so i can debug them in the console
  // in this case there really is no need for the percent and legend scales
  // to be accessible outside of this function

  const legendAxis = d3.axisBottom(scales.legend)
    .tickValues(scales.fill.domain())
    .tickSize(legendHeight)
    .tickSizeOuter(0);

  const axisGroup = group.append('g')
    .attr('id', 'color-axis')
    .attr('transform', 'translate(0, 18)')
    .call(legendAxis);

  // now lets tighten up the tick labels a bit so they don't stick out
  axisGroup.selectAll('text')
    .each(function(d, i) {
      // set the first tick mark to anchor at the start
      if (i == 0) {
        d3.select(this).attr('text-anchor', 'start');
      }
      // set the last tick mark to anchor at the end
      else if (i == legendAxis.tickValues().length - 1) {
        d3.select(this).attr('text-anchor', 'end');
      }
    });

}

/************ DRAW CIRCLE LEGEND ************/



