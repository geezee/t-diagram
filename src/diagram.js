const cts = require('./constants');
const helpers = require('./helpers');

/**
 * A diagram is a list of nodes N that looks like:
 *
 * ```
 * {
 *    name : string,
 *    parent : string, // empty or null refers to the root
 *    direction : string, // 'left' or 'right'
 *    length : number, // the length of the branch
 *    branch_at : number, // the x coord to branch at, if branch_at < 0, we use seq to compute it
 *    seq : number, // the number of the child wrt to its parent
 *    properties : Object // additional properties
 * }
 * ```
 *
 * The list must be provided in a BFS way, i.e. let node_i be the node at index i,
 * then node_i.parent = node_j.name for j < i, i.e. the parent must be in the list
 * before all of its children.
 *
 * @param {Array.<Object>} - the list of nodes as described above
 */
function TDiagram(diagram) {
    this.diagram = diagram;

    var spread = 1;
    var margins = { top: 0, left: 0 };

    // remember whether the computation of the coordinates was performed
    var coord_computed = false;

    var self = this; // to make life easier



    /*
     * Build the tree from the diagram.
     */
    this.tree = (function(diagram) {
        var tree = diagram;

        // build a dictionary with its keys being the nodes' name
        nodes = diagram.reduce(function(tree, item) {
            item.children = [];
            tree[item.name] = item;
            return tree;
        }, {});

        // go across the nodes backwards and increasingly build the tree
        tree = diagram.reverse().reduce(function(tree, item) {
            if (item.parent in tree) {
                tree[item.parent].children = [item].concat(tree[item.parent].children);
                delete tree[item.name];
            }

            return tree;
        }, nodes);

        return tree;
    })(diagram);


    /**
     * Set the spread parameter
     *
     * @param {number} s
    */
    this.setSpread = function(s) {//{{{
        spread = s;
    }//}}}


    /**
     * Set the left margin
     *
     * @param {number} m
    */
    this.setMarginLeft = function(m) {//{{{
        margins.left = m;
    }//}}}


    /**
     * Set the top margin
     *
     * @param {number} m
    */
    this.setMarginTop = function(m) {//{{{
        margins.top = m;
    }//}}}



    /**
     * This function injects a check to see if the coordinates of the graph
     * have been computed or not. If they weren't then it computes them first
     * before defining the function.
     *
     * @param {Callable} func - the function to define
     *
     * @return {Callable} the function with the check injected
    */
    function requiresCoordinates(func) {//{{{
        return function() {
            if(!coord_computed) {
                self.computeCoord();
            }

            return func.apply(self, arguments);
        }
    }//}}}


    /**
     * This function will return the root node of the current tree
     *
     * @return {Object}
    */
    this.getRoot = function() {//{{{
        // return the first tree node, ignore the others if any exist
        for(var root in this.tree) return this.tree[root];
        return null;
    }//}}}


    /*
     * Setup the coordinates based on the user input
     *
     * @param root - the root of the subtree to setup its coordinates
     * @param parent - the root's parent (if it doesn't exist then provide
     *                 a dummy object with x, y coordinates (0, 0), length (0),
     *                 children array ([root]), and pointing (POINTING_UP)
    */
    function setUpCoordinates(root, parent, pointing=cts.POINTING_RIGHT) {//{{{
        function getCoordToUpdate(pointing_dir) {
            return pointing_dir == cts.POINTING_RIGHT || pointing_dir == cts.POINTING_LEFT ? 'x' : 'y';
        }

        function getDirectionToUpdate(pointing_dir) {
            return pointing_dir == cts.POINTING_RIGHT || pointing_dir == cts.POINTING_DOWN ? 1 : -1;
        }

        root.pointing = pointing;

        root.coordinates = {};
        root.coordinates.x = parent.coordinates.x;
        root.coordinates.y = parent.coordinates.y;

        // the delta to update by
        var delta = root.branch_at == null || root.branch_at == undefined ?
            (root.seq + 1) / parent.children.length * parent.length :
            root.branch_at;

        root.coordinates[getCoordToUpdate(parent.pointing)] += delta * getDirectionToUpdate(parent.pointing);

        // compute the coordinates of every child
        root.children.forEach(function(child) {
            var angle = child.direction == 'right' ? 1 : -1;
            setUpCoordinates(child, root, (4 + pointing + angle) % 4);
        });

        if(root.end_added !== true) {
            // Also add the node for the end of the segment
            var end_seg = {
                name: root.name+'_end',
                coordinates: {
                    x: root.coordinates.x,
                    y: root.coordinates.y
                },
                pointing: root.pointing,
                length: 0,
                parent: root.name,
                hidden: true,
                branch_at: root.length,
                children: [],
                end_added: true
            };

            // Compute the end's coordinates
            end_seg.coordinates[getCoordToUpdate(root.pointing)] += root.length * getDirectionToUpdate(root.pointing);

            // add it to the list of children
            root.children.push(end_seg);

            root.end_added = true;
        }

    }//}}}


    /**
     * This function will extend the tree of the TD diagram with coordinates.x
     * and coordinates.y holding the x,y coordinates for every node.
     *
     * The function will also add a property pointing with values
     * from POINTING_UP, ..., POINTING_LEFT
    */
    this.computeCoord = function() {//{{{
        coord_computed = true;

        var root = this.getRoot();
        var parent = {
            coordinates: { x: 0, y: 0},
            length: 0,
            direction: 'right',
            pointing: cts.POINTING_UP,
            children: [root]
        };

        setUpCoordinates(root, parent);
    }//}}}


    /**
     * This function will return the height of the T-diagram generated.
     *
     * @return {number}
    */
    this.getCanvasHeight = requiresCoordinates(function() {//{{{
        var bounds = this.getBounds();
        return bounds.bottom - bounds.top + 2 * margins.top;
    });//}}}


    /**
     * This function will return the width of the T-diagram generated.
     *
     * @return {number}
    */
    this.getCanvasWidth = requiresCoordinates(function() {//{{{
        var bounds = this.getBounds();
        return bounds.right - bounds.left + 2 * margins.left;
    });//}}}
    

    /**
     * This function will generate the appropriate viewbox string to make sure
     * all the elements are in it
     * 
     * @return {String}
    */
    this.getViewbox = requiresCoordinates(function() {//{{{
        var bounds = this.getBounds();
        return (bounds.left - margins.left) + ' ' +
               (bounds.top - margins.top) + ' ' + 
               (this.getCanvasWidth() + margins.left) + ' ' +
               (this.getCanvasHeight() + margins.top);
    });//}}}


    /**
     * Generate the bounds of the svg. In other words, the box in which all the
     * elements are in.
     *
     * @return {Object} - looks like: { left: number, top : number, right: number, bottom: number }
    */
    this.getBounds = requiresCoordinates(function() {//{{{
        var geometry = this.getGeometry();
        var min_r = function(coord) { return function(min, x) { return Math.min(x.coordinates[coord], min); }; };
        var max_r = function(coord) { return function(max, x) { return Math.max(x.coordinates[coord], max); }; };

        var arr = Object.keys(geometry).map(function(k) { return geometry[k]; });

        var left = arr.reduce(min_r('x'), Number.POSITIVE_INFINITY);
        var right = arr.reduce(max_r('x'), Number.NEGATIVE_INFINITY);
        var top = arr.reduce(min_r('y'), Number.POSITIVE_INFINITY);
        var bottom = arr.reduce(max_r('y'), Number.NEGATIVE_INFINITY);

        return {left: left, top: top, right: right, bottom: bottom};
    });//}}}


    /**
     * Produce a map from the nodes' name to their geometry. The geometry of
     * the node is the object containing the direction it's pointing towards
     * (refer to POINTING_UP, ..., POINTING_LEFT), its length and
     * its coordinates (an object with x, y keys) and the name of its parent.
     *
     * @return {Object}
    */
    this.getGeometry = requiresCoordinates(function(root = null) {//{{{
        if(root == null) root = this.getRoot();

        var obj = {};

        obj[root.name] = {
            name: root.name,
            coordinates : {
                x : root.coordinates.x,
                y : root.coordinates.y
            },
            pointing : root.pointing,
            length : root.length,
            parent: root.parent,
            children: root.children.map(function(c) { return c.name }),
            hidden: root.hidden === true
        };

        if(root.branch_at !== undefined) obj[root.name].branch_at = root.branch_at;

        var children = root.children.map(function(child) {
            return self.getGeometry(child);
        }).reduce(function(total, child) {
            return helpers.extendObjs(total, child);
        }, {});

        return helpers.extendObjs(obj, children);
    });//}}}

    
}

module.exports = TDiagram;
