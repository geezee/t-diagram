# T-Diagram

A T-Diagram is a tree data structure that is drawn with horizontal and vertical lines;
a lot like metro and train maps. This package aims to draw t-diagrams in a restricted
area (provided as an aspect ratio restriction). This is done by smartly determining
where to break edges while maintaining the distances provided by the user and maintaining
the order of the children of each node.

An example T-Diagram which we would like to put on an A4 paper (A4 aspect ratio: 1.414286) is:

![The T-Diagram](https://cloud.githubusercontent.com/assets/1006260/25177428/30f658ac-2502-11e7-96f0-e91631a66c57.png)

This graph has an aspect ratio of 0.57. After executing the program we end up with:

![The Modified T-Diagram](https://cloud.githubusercontent.com/assets/1006260/25177720/3fb0affe-2503-11e7-8cab-a9c968597413.png)

which has an aspect ratio of 1.72.


## Usage

The diagram must be provided as an array of nodes, each node must have a name, a length,
a direction (where it's pointing with respect to its parent) which must be `left` or
`right`, the name of its parent and its number in the list of children of its parent.
For the root node the direction and the parent properties can be empty. Optionally, you
may provide a `branch_at` property which dictates where the node branches on the parent's
branch (if not provided, the children branches will be equidistant and uniformally
distributed on the parent branch). The code of the diagram above can be found in
the `example/example.js` file.


After the diagram has been provided to the `TDiagram` class the parameters of the
genetic algorithm that draws the diagram must be defined. These parameters should
live in an object and they are called: `alpha`, `beta`, `gamma` and `prefered_aspect_ratio`.

* `alpha`: represents how important the number of breaks is. A higher number of breaks
    would complicate the graph. Therefore a large `alpha` would boost the cost function
    which we are trying to minimize
* `beta`: represents how important the number of intersections there are. Obviously `beta`
    should be set to be large since we require that intersections be prohibited
* `gamma`: how important is the aspect ratio. If you're fine with any aspect ratio then
    you can set `gamma` to 0. If you are strict on it being close to the
    `prefered_aspect_ratio` then you can set `gamma` to be large.
* `prefered_aspect_ratio`: the target aspect ratio (width / height).

Then some more meta-information about the learning process is needed: the size of
the population, the probability of mutation and the number of generations.
The following code should describe concisely how everything fits together.

```javascript
const td = require('t-diagram');

const diagram = [...];

// the parameters used for the cost function
const cost_params = {
    alpha: 10, // how important the number of breaks is
    beta: 10, // how important the number of intersections is
    gamma: 2, // how important the aspect ratio is
    prefered_aspect_ratio: 1.414286 // the target aspect ratio
};

const population_size = 100;
const probability_mutation = 0.3;
const num_generations = 100;

const tdiagram = new td.TDiagram(diagram);
const drawer = new td.TDiagramDrawer(cost_params, population_size,
                                     probability_mutation, tdiagram);

const population = drawer.learn(num_generations, function(iter, costs) {
    var min = costs.reduce(function(x, y) {
        return x > y.total ? y.total : x;
    }, costs[0].total);

    // returning false will stop the learning
    if(min < 10)
        return false;
}, {
    pre: function(population) {}, // executed at the beginning of every generation
    selection: function(population) {}, // executed after every selection process
    breeding: function(population) {} // executed after every breeding process
});

// get the top 10
population.sort(function(s1, s2) {
    return s1.cost.total - s2.cost.total;
});
population.splice(10);

// draw the top 10
population.forEach(function(specimen) {
    console.log(specimen.diagram.generateSVG());
});
```
