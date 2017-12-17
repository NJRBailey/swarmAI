import TinyQueue from "tinyqueue";
import {
  arrayHolds, arraysEqual
} from '../actor';
// let TinyQueue = require('tinyqueue');
/**
 * A* needs checks each possible next move (i.e. N,E,S,W) and selects the one which
 * the heuristic says is closest.
 * Each non-start node is set to infinity. Then for each node we land on, we make its neighbours
 * cost equal the cost of the path + the cost of the current node + estimatedCostToTarget
 * (costOfEdge + costOfCurrentNode + estimatedCostToTarget)
 * The estimate is calculated by the heuristic.
 *
 * Nodes are ground elements
 * (more complex - actors which are not going to be in that position when this actor reaches it)
 * The target tile is the currently required objective (closest bricks/building site)
 * Note - closest might result in a blockage. Would need to be check for if a building site
 * was surrounded on 3 sides.
 * The heuristic could be straight-line distance (underestimate), or
 * it could be tile distance (abs(t[0]-c[0]))
 * The edge cost will always be 1.
 *
 * Checks are operated within this class. The Simulation and Actors do not deal with the
 * pathfinding logic.
 *
 * Analysis - some time is wasted in one of the for loops in _calculateNextStep()
 *          - using the current node as the first step in the path is wasteful
 *            It would be more efficient to have a for loop for the valid first
 *            steps - this would be code duplication from the _calculateNextSteps()
 *            in the calculateShortestPath method however.
 *
 *
 */
export class AStarSearch {
  /**
   * Constructs the search module for use by an Actor.
   * @param {Simulation} simulation The current simulation.
   * @param {Actor}      actor      The Actor we are pathfinding for.
   * @param {Function}   heuristic  The heuristic function to use. Must return a number.
   */
  constructor(simulation, actor, heuristic) {
    this.simulation = simulation;
    this.actor = actor;
    this.heuristic = heuristic;
    // The position of the next objective
    // let objective = this.actor.objective;
    // while (objective !== undefined) {}
  }

  /**
   * Calculates the shortest path between the current position and the target position.
   * Only moves on ground tiles. Recurses until a path has been found
   * or all nodes have been checked.
   * @param  {Array} current The current position of the Actor.
   * @param  {Array} target  The target position.
   * @param  {Array} [area]  The area to search through.
   * @return {Array}         The list of positions to get to the target
   */
  calculateShortestPath(current, target, area = undefined) {
    // Set the area to search
    if (area !== undefined) {
      this.area = area;
    } else {
      this.area = this.simulation.area;
    }
    // The node we will start searching from
    let currentNode = {
      position: current,
      cost: 0,
      previous: null,
    };
    // The node we are searching for
    this.target = target;
    // Tracks the currently active nodes
    this.activeNodes = new TinyQueue([currentNode], function (a, b) {
      return a.cost - b.cost;
    });
    // Tracks the already-checked nodes
    this.checkedPositions = [];

    // Will keep expanding nodes until the target is the best node, or all nodes have been expanded
    this._findBestPath();
    //TODO this.activeNodes is blank at this point - why?
    // Constructs the path by tracing the previousNode pointers back to the start
    this.path = [];
    this._constructPath(this.activeNodes.peek());
    return this.path;
  }

  _findBestPath() {
    // If the best node is not the target node, we continue searching
    let bestNode = this.activeNodes.peek();
    if (bestNode !== undefined) {
      if (!arraysEqual(bestNode.position, this.target)) {
        this._exploreNode(bestNode);
      }
    }
  }

  _exploreNode(node) {
    // Remove this node from the list of active nodes
    this.activeNodes.pop();
    this.checkedPositions.push(node.position);
    let edges = this.getValidNextEdgePositions(node.position)
    for (let edge of edges) {
      let nextNode = {
        position: edge,
        cost: 1 + node.cost + this.heuristic(edge, this.target),
        previous: node,
      };
      this.activeNodes.push(nextNode);
    }
    this._findBestPath();
  }

  _constructPath(node) {
    // If node is undefined, there is no valid path to the target
    if (node !== undefined) {
      if (node.previous !== null) {
        // We don't want to add the target to our path, as we will only navigate next to a target
        if (!arraysEqual(node.position, this.target)) {
          this.path.unshift(node.position);
        }
        this._constructPath(node.previous);
      }
    }
  }

  /**
   * Returns the positions of the ground and goal tiles around the specified tile
   * @param {Array} position The position
   * @return {Array} The ground tiles
   */
  getValidNextEdgePositions(position) {
    let edges = {
      elements: [
        this.area[position[0] - 1][position[1]], // North
        this.area[position[0]][position[1] + 1], // East
        this.area[position[0] + 1][position[1]], // South
        this.area[position[0]][position[1] - 1] // West
      ],
      positions: [
        [position[0] - 1, position[1]],
        [position[0], position[1] + 1],
        [position[0] + 1, position[1]],
        [position[0], position[1] - 1]
      ]
    };
    let validEdges = [];
    for (let index = 0; index < edges.elements.length; index++) {
      // Valid edges are ground elements, the Actor's dispenser, the Actor's objective, or the Actor itself
      if (
        (this.actor.config.ground.includes(edges.elements[index]) ||
          arraysEqual(this.actor.dispenser, edges.positions[index]) ||
          arraysEqual(this.actor.objective, edges.positions[index]) ||
          edges.elements[index] === 'a') &&
        !arrayHolds(this.checkedPositions, edges.positions[index])
      ) {
        validEdges.push(edges.positions[index]);
      }
    }
    // We check if any of the invalid edges were checked before - if they were, we want to return an empty array to indicate the fact
    if (validEdges.length === 0 && !edges.elements.includes("A") && !arrayHoldsAny(this.checkedPositions, edges.positions)) {
      throw new Error(
        this.actor.identifier + " is surrounded by immovable objects"
      );
    } else if (validEdges.length === 0 && !arrayHoldsAny(this.checkedPositions, edges.positions)) {
      // There is an actor blocking us in
      throw new Error(
        this.actor.identifier + " is being blocked in by another Actor"
      );
    }
    return validEdges;
  }
}

/**
 * Checks if an Array holds any of the arrays contained in the items parameter
 * @param  {Array}   arr   The Array we are checking
 * @param  {Array}   items An Array of Arrays
 * @return {Boolean}
 */
function arrayHoldsAny(arr, items) {
  for (let item of items) {
    let holds = arrayHolds(arr, item);
    if (holds === true) {
      return true;
    }
  }
  return false;
}