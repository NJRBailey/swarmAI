import { AStarSearch } from "./pathfinding/a-star-search.js";
import TinyQueue from "tinyqueue";

/**
 * A basic Actor for the Simulation.
 * @version Basic
 * @author NJRBailey
 *
 * Actors want to pick up blocks, place the block, and repeat until done, without:
 *  - Colliding with another Actor or block
 *  - Making the same section as another Actor
 *  - Barring off a section from being made (e.g. by surrounding an empty objective point with blocks)
 *
 * One way would be to have the bots constantly trading locations
 * I think a better way would be to use a path-finding algorithm (e.g. A*) to determine a path for each Actor to the next objective,
 * which is shared out to the other Actors, and update it if three conditions are met:
 *  1) The paths cross the same point for multiple Actors
 *  2) The paths will cross after the same number of moves (tiles traversed)
 *  3) The priority for this Actor is less than for the other Actor
 * This point will then need to be temporarily blacklisted for that actor, until the next objective is completed
 * For this version of the Actor there are no chokepoints, so the Actors can be constantly moving.
 * Performing an action, like picking up or placing an item, takes one move.
 *
 * Could store multiple algorithms
 * And optimisations could be things like 'only calculate x moves in front' where x depends
 */
export class Actor {
  /**
   * Create a new basic Actor
   * @param {Object}     config      The config settings for Actors
   * @param {String}     identifier The unique identifier for this Actor
   * @param {Integer}    priority   The priority to use in path disputes - lower value means higher importance
   * @param {Array}      position   The coordinates of the starting position
   * @param {Simulation} simulation The Simulation to broadcast position, route, objective point to
   */
  constructor(config, simulation) {
    this.config = config;
    this.identifier = config.identifier;
    this.priority = config.priority;
    this.simulation = simulation;
    // Whether the Actor should be performing tasks
    this.active = true;
    // Whether the Actor is carrying an item
    this._item = undefined;
    // The position of the Actor
    this.position = config.startingPosition;
    // The current objective position of the Actor
    this.objective = undefined;
    // The current path of the Actor
    this.path = [];
    // Objective priorities as an array
    // Sorts based on total number of moves required to reach objective from spawn
    let objectivePriorityQueue = new TinyQueue([], function(a, b) {
      return (
        Math.abs(this.position[0] - a[0]) +
        Math.abs(this.position[1] - a[1]) -
        (Math.abs(this.position[0] - b[0]) + Math.abs(this.position[1] - b[1]))
      );
    });
    this.sortedObjectives = [];
    while (TinyQueue.length > 0)
      sortedObjectives.push(objectivePriorityQueue.pop());

    // for testing
    window.actors.push(this);
  }

  /**
   * Returns the elements at the edge of the Actor.
   * @return {Object} The elements and positions at each edge.
   */
  getSurroundings() {
    // FIXME will probably crash if we check invalid indices (e.g. [-1])
    let actorRow = this.position[0];
    let actorColumn = this.position[1];
    // The elements on each of the four edges
    let edges = {
      elements: [
        this.simulation.area[actorRow - 1][actorColumn], // North
        this.simulation.area[actorRow][actorColumn + 1], // East
        this.simulation.area[actorRow + 1][actorColumn], // South
        this.simulation.area[actorRow][actorColumn - 1] // West
      ],
      positions: [
        [actorRow - 1, actorColumn], // North
        [actorRow, actorColumn + 1], // East
        [actorRow + 1, actorColumn], // South
        [actorRow, actorColumn - 1] // West
      ]
    };
    return edges;
  }

  /**
   * Returns the current row and column of this Actor
   * @return {Array} The actor's row and column
   */
  getPosition() {
    return this.position;
  }

  /**
   * Moves one position in the specified direction, if allowed.
   * @param {String} direction The direction to move in | N,E,S,W
   */
  move(direction) {
    let edges = this.getSurroundings().elements;
    switch (direction) {
      case "N":
        if (this.config.ground.includes(edges[0])) {
          let north = [this.position[0] - 1, this.position[1]];
          this.simulation.swapElements(this.position, north);
          this.position = north;
        } else {
          throw new Error("Tried to move into a: " + edges[0]);
        }
        break;
      case "E":
        if (this.config.ground.includes(edges[1])) {
          let east = [this.position[0], this.position[1] + 1];
          this.simulation.swapElements(this.position, east);
          this.position = east;
        } else {
          throw new Error("Tried to move into a: " + edges[1]);
        }
        break;
      case "S":
        if (this.config.ground.includes(edges[2])) {
          let south = [this.position[0] + 1, this.position[1]];
          this.simulation.swapElements(this.position, south);
          this.position = south;
        } else {
          throw new Error("Tried to move into a: " + edges[2]);
        }
        break;
      case "W":
        if (this.config.ground.includes(edges[3])) {
          let west = [this.position[0], this.position[1] - 1];
          this.simulation.swapElements(this.position, west);
          this.position = west;
        } else {
          throw new Error("Tried to move into a: " + edges[3]);
        }
        break;
    }
  }

  /**
   * Picks up the specified item if it is next to one
   * @param {String} item An item element
   */
  takeItem(item) {
    if (this.config.items.includes(item)) {
      let edges = this.getSurroundings();
      for (let edge of edges.elements) {
        if (edges.includes(item)) {
          // Lower case indicates an item, rather than a spawner
          this.item = item.toLowerCase();
        } else {
          throw new Error(
            this.identifier +
              " tried to take an item: " +
              item +
              " that it was not next to"
          );
        }
      }
    } else {
      throw new Error(
        this.identifier + "tried to take an unspecified item: " + item
      );
    }
  }

  /**
   * Places the currently held item in the position
   * @param {Array} position The position to place the item in
   */
  placeItem(position) {
    if (this.item !== undefined) {
      this.simulation.replaceElement(position, this.item);
      this.item = undefined;
    } else {
      throw new Error(
        this.identifier + " tried to place an item while it was not holding one"
      );
    }
  }

  /**
   * Starts the Actor's pathfinding goals.
   * @param {Integer} time The time between moves in milliseconds
   */
  activate(time) {
    this.searcher = new AStarSearch(
      this.simulation,
      this,
      this.config.heuristic
    );
    this.objective = this.sortedObjectives[0];
    while (this.objective !== undefined) {
      // Check that objective is not the same as another actor
      for (let actor of this.simulation.actors) {
        if (this.objective === actor.objective && actor.identifier !== this.identifier && this.priority < actor.priority) {
          this.sortedObjectives.shift();
          this.objective = this.sortedObjectives[0];
        }
      }
      // need to update objectives list
    }
    // let path = this.searcher.
    // setInterval(time)
  }

  // Calculate where to place algorithm
  // case for each direction
  // this.placeItem([
  //   this.getPosition()[0] + x,
  //   this.getPosition()[1] + y,
  // ])
}
