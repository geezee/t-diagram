const cts = require('./constants');
const TDiagram = require('./diagram');
const helpers = require('./helpers');

/**
 * A class responsible for manipulating a tdiagram and evaluating how good it is.
 *
 * @param {TDiagram} - a tdiagram object
*/
function TDiagramCost(tdiagram) {
    this.tdiagram = tdiagram;
    this.geometry = tdiagram.getGeometry();
    this.num_branches = 0;

    var self = this;

    this.data = {};

    /**
     * Compute a number representing how much the branches of the graph intersect
     * one with the other. The more intersections there are, the higher the number.
     * It's always a positive number.
     *
     * The underlying algorithm uses the Bentley Ottmann Algorithm
     *
     * @return {Number}
    */
    this.intersections = function() {//{{{
        function project(axis) {
            return function(segment) {
                return {
                    projected: [segment[0][axis], segment[1][axis]],
                    other: segment[0][1-axis]
                };
            }
        }

        // find all the segments in the graph
        var segments = Object.keys(self.geometry).map(function(node) {
            node = self.geometry[node];
            return node.children.map(function(child) {
                child = self.geometry[child];
                return [[node.coordinates.x,  node.coordinates.y],
                        [child.coordinates.x, child.coordinates.y]];
            });
        }).reduce(function(total, segments) {
            return total.concat(segments);
        }, []);

        // get the horizontal segments
        var horizontal_segments = segments.filter(function(segment) {
            return segment[0][1] == segment[1][1];
        });

        // get the vertical segments
        var vertical_segments = segments.filter(function(segment) {
            return segment[0][0] == segment[1][0];
        });

        var his = uni_dir_intersections(horizontal_segments.map(project(0)));
        var vis = uni_dir_intersections(vertical_segments.map(project(1)));

        var pis = perp_intersections(segments);

        return his + vis + pis;

    }//}}}


    /**
     * Given an array of 1D segments grouped by a number, this function returns
     * the number of intersections there are in these segments.
     *
     * @param {Object.<number, Array.<[number, number]>>} segments - grouped and projected
     * @return {number} the number of intersections
    */
    function uni_dir_intersections(segments) {//{{{
        // group by the other direction
        var grouped = {};
        segments.forEach(function(segment) {
            if(segment.other in grouped)
                grouped[segment.other].push(segment.projected);
            else grouped[segment.other] = [segment.projected];
        });

        var count = 0;

        // sort each group and compute the number of intersections
        for(group in grouped) {
            if(grouped[group].length == 1) {
                delete grouped[group];
            } else {
                grouped[group].forEach(function(s) {
                    s.sort();
                });
                grouped[group].sort(function(seg1, seg2) {
                    return seg1[0] - seg2[0];
                });

                grouped[group].forEach(function(segment, index, segments) {
                    var max_ind = helpers.binarySearch(segments, segment[1], function(seg) {
                        return seg[0];
                    });

                    // quit if there aren't any ahead
                    if(max_ind <= index) return;

                    // set the last one if it's too large
                    if(max_ind >= segments.length) max_ind = segments.length - 1;

                    // since binarySearch returns index of >= and we want the max
                    // index such that <=. This should fix it.
                    if(segments[max_ind][0] > segment[1]) max_ind -= 1;

                    // max_ind - index is the number of intersections
                    count += max_ind - index;
                });
            }
        }

        return count;
    }//}}}


    /**
     * Given a set of segments, this function returns the number of intersections
     * between these segments.
     *
     * @type {Segment} Array.<Array.<number, number>, Array.<number, number>>
     * @param {Array.<Segmet>} segment
     *
     * @return {number}
    */
    function perp_intersections(segments) {//{{{
        function inverse(segment) {
            return [segment[1], segment[0]];
        }

        function is_horizontal(segment) {
            return segment[0][1] == segment[1][1];
        }

        function is_vertical(segment) {
            return segment[0][0] == segment[1][0];
        }

        function getIntersection(set, segment) {
            var count = 0;
            for(k in set) {
                var hor = set[k];
                if(segment[0][1] <= hor[0][1] && hor[0][1] <= segment[1][1])
                    count += 1;
            }
            return count;
        }

        // Prepare the data
        var set = {};
        // remove all duplicates
        segments.map(function(x) {
            var key = JSON.stringify(x);
            if(key in set) return undefined;
            set[key] = true;
            return key;
        }).filter(function(x) {
            return x !== undefined;
        });

        // duplicate and add the ones inverted
        segments = segments.concat(segments.map(inverse));

        segments.sort(function(seg1, seg2) {
            return seg1[0][0] - seg2[0][0];
        });

        set = {};
        var count = 0;
        segments.forEach(function(segment) {
            if(is_vertical(segment)) {
                count += getIntersection(set, segment);
            } else {
                var key = JSON.stringify(inverse(segment));
                // if the inverse is in it then we're reached the end of the segment, remove it
                if(key in set) {
                    delete set[key];
                }
                // otherwise add it
                else {
                    set[JSON.stringify(segment)] = segment;
                }
            }
        });

        return count;
    }//}}}


    /**
     * Compute the cost of the graph, the graph of the cost is a linear combination
     * of the following factors:
     *
     * 1. the number of branches, the more branches there are, the higher the cost
     * 2. the intersections, the more intersections there are, the higher the cost
     * 3. how close the aspect ratio of the graph is from the prefered one
     *
     * @param {number} alpha - how important (1) is
     * @param {number} beta - how important (2) is
     * @param {number} gamma - how important (3) is
     * @param {number} prefered_aspect_ratio - the prefered aspect ratio of the user
     *
     * @return {branches_factor: number,
     *          intersection_factor: number,
     *          ar_factor: number,
     *          total: number}
    */
    this.cost = function(alpha, beta, gamma, prefered_aspect_ratio) {//{{{
        // how many branches did we use
        var branches_factor = Math.pow(self.num_branches, 2);

        // how many intersections
        var intersections = self.intersections();

        // how close things are to the aspect ration needed
        var ar_diagram = self.tdiagram.getCanvasWidth() / self.tdiagram.getCanvasHeight();
        var ar = Math.exp(Math.max(ar_diagram, prefered_aspect_ratio) /
                 Math.min(ar_diagram, prefered_aspect_ratio) - 1);

        return {
            branches_factor: branches_factor,
            intersection_factor: intersections,
            ar_factor: ar - 1,
            total: alpha * branches_factor + beta * intersections
                + Math.pow(ar, gamma) - 1
        };
    }//}}}



    /**
     * Add breaking points to branches, breaking points always make the station
     * turn to the right
     * 
     * breaks is a dictionary that maps a branch name (name of its origin node)
     * to a break point (percentage at where to break)
     * breaks : String -> Number
    */
    this.introduceBreaks = function(breaks) {//{{{

        self.num_branches = Object.keys(breaks).length;

        /* To introduce a break, the following steps must be done:
         * 1. locate the children to be added to the break node
         * 2. remove those children from the parent and add them to the break node
         * 3. add the break node as a child
         * 4. update the length of the parent
         * 5. update the coordinates of the parent
        */
        Object.keys(breaks).forEach(function(node) {
            var break_at = breaks[node];
            var l = self.geometry[node].length * break_at;

            // the name of the break
            var break_node_name = (function() {
                do {
                    var rand = Math.round(Math.random() * 10e10);
                } while('b' + rand in self.geometry);
                return 'b'+rand;
            })();
            
            // locate the spliting point
            var arr = self.geometry[node].children.map(function(child) {
                child = self.geometry[child];
                return Math.abs(child.coordinates.x - self.geometry[node].coordinates.x) +
                       Math.abs(child.coordinates.y - self.geometry[node].coordinates.y);
            });
            var index_to_break = helpers.binarySearch(arr, l);

            // remove some children from the node, and add the break to the node
            var newChildren = self.geometry[node].children.splice(index_to_break);
            self.geometry[node].children.push(break_node_name);

            // the node_name_end must stay in the node's children
            self.geometry[node].children.push(newChildren.splice(-1)[0]);

            // build the break node
            var break_node = {
                name: break_node_name,
                coordinates: {
                    x: self.geometry[node].coordinates.x +
                       (self.geometry[node].pointing % 2) * (self.geometry[node].pointing == cts.POINTING_RIGHT ? 1 : -1) * l,
                    y: self.geometry[node].coordinates.y +
                       ((self.geometry[node].pointing + 1) % 2) * (self.geometry[node].pointing == cts.POINTING_DOWN ? 1 : -1) * l
                },
                pointing: self.geometry[node].pointing % 2 == cts.VERTICAL ? cts.POINTING_RIGHT : cts.POINTING_UP, // point always up or right
                length: self.geometry[node].length - l,
                parent: node,
                children: newChildren,
                hidden: true,
                branch_at: l
            };

            // change the length of the parent
            self.geometry[node].length = l;

            // update the parent of the children
            newChildren.forEach(function(child) {
                self.geometry[child].parent = break_node_name;
            });

            // add it to the geometry list
            self.geometry[break_node_name] = break_node;
        });


        updateFromGeometry();
    }//}}}


    /*
     * From a modified geometry, this function will update the tdiagram object
     * to reflect these changes. These changes are changes to the structure of
     * the tree and/or settings used for drawing, not the actual coordinates.
    */
    function updateFromGeometry() {//{{{
        // build tdiagram
        var tdiagram = Object.keys(self.geometry).filter(function(k) {
            return !k.endsWith('_end');
        }).map(function(k) {
            var node = self.geometry[k];
            if(node.parent == null || node.parent == '') {
                node.direction = 'right';
                node.seq = 0;
            } else {
                var parent = self.geometry[node.parent];
                node.direction = parent.pointing - node.pointing > 0 ? 'left' : 'right';
                node.seq = parent.children.indexOf(node.name);
            }

            return node;
        });

        // apply a topological sort
        var sorted_tdiagram = (function sort(tree) {
            if(tree.length == 0) return [];
            var node = tree.pop();
            var answer = [];

            if(self.geometry[node.name].added !== true) {
                var parent = self.geometry[node.parent];
                while(node.parent in self.geometry && parent.added !== true) {
                    answer.push(parent);
                    self.geometry[parent.name].added = true;
                    if(parent.parent in self.geometry) {
                        parent = self.geometry[parent.parent];
                    } else break;
                }
                answer.splice(0, 0, node);
                self.geometry[node.name].added = true;
            }

            return answer.reverse().concat(sort(tree));
        })(tdiagram);

        // reset the tdiagram and the geometry
        self.tdiagram = new TDiagram(sorted_tdiagram);
        self.tdiagram.computeCoord();
        self.geometry = self.tdiagram.getGeometry();
    }//}}}


    /**
     * Generate a very basic SVG displaying the graph
     *
     * @return {String}
    */
    this.generateSVG = function() {//{{{
        function concat(x, y) { return x + y; }

        var body = Object.keys(self.geometry).map(function(name) {
            var node = self.geometry[name];
            var circle = '<circle '+helpers.dict2attributes({
                fill: 'black',
                r: 2,
                cx: node.coordinates.x,
                cy: node.coordinates.y
            })+'/>';
            var lines = node.children.map(function(c) {
                return '<line '+helpers.dict2attributes({
                    x1: node.coordinates.x,
                    y1: node.coordinates.y,
                    x2: self.geometry[c].coordinates.x,
                    y2: self.geometry[c].coordinates.y,
                    'stroke-width': 1,
                    stroke: 'black'
                })+'/>';
            }).reduce(concat, '');

            if(node.hidden) return lines;
            return circle + lines;
        }).reduce(concat, '');

        self.tdiagram.setMarginLeft(10);
        self.tdiagram.setMarginTop(10);
        return '<svg '+helpers.dict2attributes({
            width: self.tdiagram.getCanvasWidth(),
            height: self.tdiagram.getCanvasHeight(),
            viewbox: self.tdiagram.getViewbox(),
            xmlns: "http://www.w3.org/2000/svg"
        })+'>'+body+'</svg>';
    }//}}}
}


module.exports = TDiagramCost;
