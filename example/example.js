const td = require("../index");

// the parameters used for the cost function
const cost_params = {
    alpha: 5, // how important the number of breaks is
    beta: 1, // how important the number of intersections is
    gamma: 10, // how important the aspect ratio is
    prefered_aspect_ratio: 1.414286 // the target aspect ratio
};

// an example diagram
const diagram  = [
    {//{{{
        name: "0",
        type: '',
        length: 100,
        direction: 'left',
        seq: 0,
        parent: ''
    },
    {
        name: "00",
        type: '',
        length: 170,
        direction: 'left',
        // branch_at: 70,
        seq: 0,
        parent: '0'
    },
    {
        name: '01',
        type: '',
        length: 50,
        direction: 'left',
        // branch_at: 80,
        seq: 1,
        parent: '0'
    },
    {
        name: '02',
        type: '',
        length: 20,
        direction: 'right',
        // branch_at: 90,
        seq: 2,
        parent: '0'
    },
    {
        name: '000',
        type: '',
        length: 10,
        direction: 'right',
        seq: 0,
        parent: '00'
    },
    {
        name: '001',
        type: '',
        length: 15,
        direction: 'right',
        seq: 1,
        parent: '00'
    },
    {
        name: '002',
        type: '',
        length: 10,
        direction: 'right',
        seq: 2,
        parent: '00'
    },
    {
        name: '010',
        type: '',
        length: 10,
        direction: 'right',
        seq: 0,
        parent: '01'
    },
    {
        name: '0100',
        type: '',
        length: 7,
        direction: 'right',
        seq: 0,
        parent: '010'
    }
//}}}
].map(function(item) {
    return {
        name: item.name,
        parent : item.parent,
        direction: item.direction.toLowerCase(),
        length: item.length,
        branch_at : item.branch_at,
        seq : item.seq,
        properties : {
            type : item.type.toUpperCase()
        }
    };
});


const tdiagram = new td.TDiagram(diagram);
const drawer = new td.TDiagramDrawer(cost_params, 100, 0.3, tdiagram);

console.error("Iteration, Min Cost");

// do the learning
const population = drawer.learn(10, function(iter, costs) {
    var min = costs.reduce(function(x, y) {
        return x > y.total ? y.total : x;
    }, costs[0].total);

    console.error((iter + 1)+","+min);
});

// get the top 10 specimens
population.sort(function(s1, s2) {
    return s1.cost.total - s2.cost.total;
});
population.splice(10);

// draw them
console.log("<table><tr>");
population.forEach(function(specimen) {
    var ar = Math.round(100 *
                specimen.diagram.tdiagram.getCanvasWidth() /
                specimen.diagram.tdiagram.getCanvasHeight()) / 100;
    console.log("<td>");
    console.log("<strong>Cost: ", Math.round(specimen.cost.total), "</strong><br>");
    console.log("<strong>Aspect Ratio: ", ar, "</strong><br>");
    console.log(specimen.diagram.generateSVG());
    console.log("</td>");
});
console.log("</tr></table>");
