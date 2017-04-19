/**
 * @module tdiagram
 * @author George Zakhour
 *
 * This module is responsible for drawing and manipulating TDiagrams. The TDiagram
 * class is responsible for parsing and drawing (by providing a geometry) of TDiagrams.
 * The TDiagramDrawer on the other hand is responsible to determine breaking points
 * in the diagram such that it can fit in a given box of a given aspect ratio with
 * the minimum amount of intersecting edges.
 *
 * To run an example and see the performance, execute the following commands:
 *
 * # cd example
 * # node example.js > /tmp/sample.html 2> /tmp/performance.csv
*/
module.exports = {
    TDiagram: require('./src/diagram'),
    TDiagramDrawer: require('./src/drawer'),
}
