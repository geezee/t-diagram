const TDiagramCost = require('./cost');
const helpers = require('./helpers');

/**
 * Create the engine to find the most optimal TDiagram shape
 *
 * The underlying engine uses a genetic algorithm to minimize the cost function
 * of a tdiagram. Refer to TDiagramCost class for the cost function.
 *
 * @param {object} cost_params - an object containing the values for alpha, beta,
 *                               gamma and prefered_aspect_ratio
 * @param {number} population_size - the original size of the population
 * @param {number} mutation_prob - the probability of a mutation
 * @param {TDiagram} diagram - the diagram to optimize
 *
 * @type {CostfulDiagram} {{diagram: TDiagramCost, id: number, breaks: Object, cost: number}}
 * @type {CostlessDiagram} {{diagram: TDiagramCost, breaks: Object, id: number}}
*/
function TDiagramDrawer(cost_params, population_size, mutation_prob, diagram) {
    var self = this;
    this.diagram = diagram;
    this.geometry = this.diagram.getGeometry();

    this.probability_of_adding_branch = mutation_prob;
    this.population = createPopulation();

    var counter = 0; // to have an id for every specimen


    /**
     * Given a specimen from the population, this function provides the cost
     * of this specimen
     *
     * @param {CostlessDiagram} specimen
     *
     * @return {branches_factor: number,
     *          intersection_factor: number,
     *          ar_factor: number,
     *          total: number}
    */
    function cost(specimen) {//{{{
        return specimen.diagram.cost(cost_params.alpha, cost_params.beta,
            cost_params.gamma, cost_params.prefered_aspect_ratio);
    }//}}}


    /**
     * This function creates a random specimen, a random specimen is one with random
     * breaks
     *
     * @return {CostlessDiagram} returns an object containing the diagram and the
     *                           breaks introduced
    */
    function createRandomSpecimenFromBreaks(breaks) {//{{{
        var tdiagramBreaker = new TDiagramCost(diagram);

        if(typeof breaks !== 'object') {
            breaks = Object.keys(self.geometry).filter(function(x) {
                return Math.random() < self.probability_of_adding_branch &&
                       !self.geometry[x].hidden;
            }).reduce(function(total, node) {
                total[node] = Math.random() * 0.8 + 0.1;
                return total;
            }, {});
        }

        tdiagramBreaker.introduceBreaks(breaks);

        return {
            diagram: tdiagramBreaker,
            breaks: breaks,
            id: counter++
        };
    }//}}}


    /**
     * Create a random population
     *
     * @return {Array.<CostlessDiagram>}
    */
    function createPopulation() {//{{{
        var population = Array(population_size).fill(undefined).map(createRandomSpecimenFromBreaks);
        return population;
    }//}}}


    /**
     * This function will extend each specimen in the population with a property
     * `cost` to include the cost of that specimen
    */
    this.gradePopulation = function() {//{{{
        self.population = self.population.map(function(specimen) {
            if(!('cost' in specimen))
                specimen.cost = cost(specimen);
            return specimen;
        });
    }//}}}

    /**
     * Perform the selection part of the GA algorithm. This will restrict the size
     * of the population array, requires that gradePopulation was called before
    */
    this.performSelection = function() {//{{{
        var max = self.population.reduce(function(t, x) {
            return t < x.cost.total ? x.cost.total : t;
        }, 0);
        self.population = self.population.filter(function(specimen) {
            return specimen.cost.total < Math.random() * max;
        });
    }//}}}


    /**
     * Perform a step in the optimization algorithm.
     *
     * @param {Function : Array<CostfullDiagram> -> X} callbacks.pre
     *         perform a callback on the array of specimen before doing anything else
     * @param {Function : Array<CostfullDiagram> -> X} callbacks.selection
     *         perform a callback on the array of specimen right after the selection
     * @param {Function : Array<CostfullDiagram> -> X} callbacks.breeding
     *         perform a callback on the array of specimen right after the breeding
    */
    this.step = function(callbacks) {//{{{
        callbacks = helpers.extendObjs({
            pre: function(x) {},
            selection: function(x) {},
            breeding: function(x) {},
        }, callbacks);

        // Perform the selection
        self.gradePopulation();

        callbacks.pre(self.population);

        self.performSelection();

        callbacks.selection(self.population);

        // Perform the crossover & mutation
        var parents = self.population;
        self.population = Array(population_size).fill(0).map(function() {
            // crossover
            var p1 = Math.floor(Math.random() * parents.length);
            var p2 = p1;
            while(p2 == p1) p2 = Math.floor(Math.random() * parents.length);
            p1 = parents[p1];
            p2 = parents[p2];

            var breaks = {};
            for(k in p1.breaks) if(Math.random() > 0.5) breaks[k] = p1.breaks[k];
            for(k in p2.breaks) if(Math.random() > 0.5) breaks[k] = p2.breaks[k];


            // mutation can be a change in the value at each branch
            for(k in breaks) 
                if(Math.random() < mutation_prob)
                    breaks[k] = Math.min(0.1, Math.max(0.9, breaks[k] + Math.random() * 0.1 - 0.05));

            // or removing a branch
            if(Math.random() < self.probability_of_adding_branch) {
                var branches = Object.keys(breaks);
                var rand_branch = branches[Math.floor(Math.random()*branches.length)];
                delete branches[rand_branch];
            }

            // or a new branch
            if(Math.random() < self.probability_of_adding_branch) {
                var possible_nodes = Object.keys(self.geometry).filter(function(x) {
                    return !self.geometry[x].hidden;
                });

                if(Object.keys(breaks).length < possible_nodes.length) {
                    do {
                        var rand_id = Math.floor(Math.random() * possible_nodes.length);
                        var random_node = possible_nodes[rand_id];
                    } while(random_node in breaks);

                    breaks[random_node] = Math.random() * 0.8 + 0.1;
                }
            }

            return createRandomSpecimenFromBreaks(breaks);
        });

        self.gradePopulation();

        callbacks.breeding(self.population);
    }//}}}


    /**
     * This function executes a step in the optimization process as many times
     * as provided. After the learning has finished, the population is returned.
     * You may take the specimen with the least cost or select any at random,
     * the strategy is up to you.
     *
     * @param {number} generation_limit - the number of times to execute a step
     * @param {Function : number x Array.<number> -> boolean} step_callback -
     *        the callback to use after every step
     * @param {Function : ...} callbacks - refer to the documentation of the step
     *        function for a detailed explanation of the list of callbacks
     *
     * The step_callback function takes 2 arguments, the first one is the number
     * of the iteration that's about to start, the second is the list of the costs
     * of each diagram that the iteration will work on. If step_function returns
     * false then the learning process is stopped. This may be used when you have
     * a target cost you want to reach and you've seen that you've already reached.
     *
     * @return {Array.<CostfullDiagram>}
    */
    this.learn = function(generation_limit, step_callback, callbacks) {//{{{
        step_callback = step_callback || function(x, y) { return true; };

        for(var i=0;i<generation_limit;i++) {
            self.step(callbacks);

            var ans = step_callback(i, self.population.map(function(x) {
                return x.cost;
            }));
            if(ans === false) break;
        }

        return self.population;
    }//}}}
}


module.exports = TDiagramDrawer;
