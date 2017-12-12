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
 *
 * We might need (want) a 3D array so that we can more easily model an Actor
 * standing on top of an Objective tile to get to an otherwise-inaccessible Goal
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
    let objectivePriorityQueue = new TinyQueue(
      this.config.objectiveSpaces,
      (a, b) => {
        return (
          Math.abs(this.position[0] - a[0]) +
          Math.abs(this.position[1] - a[1]) -
          (Math.abs(this.position[0] - b[0]) +
            Math.abs(this.position[1] - b[1]))
        );
      }
    );
    this.sortedObjectives = [];
    while (objectivePriorityQueue.length > 0) {
      this.sortedObjectives.push(objectivePriorityQueue.pop());
    }

    // for testing
    window.actors.push(this);
  }

  /**
   * Returns the elements and positions at the edge of the Actor.
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
   * Moves the Actor to the specified position if valid
   * @param {Array} position The position to move to
   */
  _move(position) {
    let edges = this.getSurroundings();
    if (arrayHolds(edges.positions, position)) {
      // If we're trying to move into a ground element...
      if (
        this.config.ground.includes(
          edges.elements[getArrayIndex(edges.positions, position)]
        )
      ) {
        this.simulation.swapElements(this.position, position);
        this.position = position;
      } else {
        throw new Error(
          this.identifier + " tried to move into an invalid element."
        );
      }
    } else {
      throw new Error(
        this.identifier +
          " tried to move to a position " +
          position +
          " that it was not next to."
      );
    }
    this.simulation.print();
  }

  /**
   * Moves one position in the specified direction, if allowed.
   * Only used in manual control.
   * @param {String} direction The direction to move in | N,E,S,W
   */
  moveCardinal(direction) {
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
      if (edges.elements.includes(item)) {
        // Lower case indicates an item, rather than a spawner
        this._item = item.toLowerCase();
      } else {
        throw new Error(
          this.identifier +
            " tried to take an item: " +
            item +
            " that it was not next to"
        );
      }
    } else {
      throw new Error(
        this.identifier + "tried to take an unspecified item: " + item
      );
    }
    this.simulation.print();
  }

  /**
   * Places the currently held item in the position
   * @param {Array} position The position to place the item in
   */
  placeItem(position) {
    if (this._item !== undefined) {
      this.simulation.replaceElement(position, this._item);
      this._item = undefined;
    } else {
      throw new Error(
        this.identifier + " tried to place an item while it was not holding one"
      );
    }
    this.simulation.print();
  }

  /**
   * Pathfind to goal
   */
  navigate() {
    // Will be set to the nearest item dispenser
    let dispenser;

    this.searcher = new AStarSearch(
      this.simulation,
      this,
      this.config.heuristic
    );
    this.objective = this.sortedObjectives[0];
    while (this.objective !== undefined) {
      // Check that objective is not the same as another actor
      for (let actor of this.simulation.actors) {
        if (
          this.objective === actor.objective &&
          actor.identifier !== this.identifier &&
          this.priority < actor.priority
        ) {
          this.sortedObjectives.shift();
          // TODO will this immediately cancel the while loop? I doubt it
          this.objective = this.sortedObjectives[0];
        }
      }
      if (this._item === undefined) {
        // If we aren't holding an item, go to the nearest resource
        // We sort the resources
        let distanceSortedDispensers = new TinyQueue(
          this.simulation.itemSpaces,
          function(a, b) {
            return (
              Math.abs(this.position[0] - a[0]) +
              Math.abs(this.position[1] - a[1]) -
              (Math.abs(this.position[0] - b[0]) +
                Math.abs(this.position[1] - b[1]))
            );
          }
        );
        // Pick the nearest one
        dispenser = distanceSortedDispensers.peek();
        console.log("calculating shortest path to dispenser");
        this.path = this.searcher.calculateShortestPath(
          this.position,
          dispenser
        );
        console.log("calculated shortest path to dispenser");
        console.log(this.path);
      } else {
        console.log("calculating shortest path to objective");
        this.path = this.searcher.calculateShortestPath(
          this.position,
          this.objective
        );
        console.log("calculated shortest path to objective");
        console.log(this.path);
      }
      // Check that there is a path to follow
      if (this.path === null) {
        throw new Error(
          "Path contained null values. Path returned as: " + this.path
        );
      }

      // Check that the path won't cause a collision with another Actor
      // If it will, recalculate with that tile blacklisted, and repeat until there will be no collisions

      // Holds the positions which this Actor should not travel upon to reach this goal
      let blacklistArea = this.simulation.area;
      // Will be set to true if we change any tiles
      let blacklist = false;
      for (let actor of this.simulation.actors) {
        for (let index = 0; index < path.length; index++) {
          if (
            arraysEqual(this.path[index], actor.path[index]) &&
            this.priority < actor.priority
          ) {
            // Set the position as impassable for this Actor
            blacklistArea[this.path[index][0]][this.path[index][1]] = "/";
            blacklist = true;
          }
        }
      }
      // If any collision points have been identified, recalculate the path
      if (blacklist === true) {
        console.log("searching blacklist area");
        if (dispenser !== undefined) {
          this.path = this.searcher.calculateShortestPath(
            this.position,
            dispenser,
            blacklistArea
          );
          console.log("calculated shortest path with blacklist");
        } else {
          this.path = this.searcher.calculateShortestPath(
            this.position,
            this.objective,
            blacklistArea
          );
          console.log("calculated shortest path with blacklist");
        }
      }
      // Now follow the path
      for (let position of this.path) {
        this._move(position);
      }
      console.log("moved along path");
      // We're next to the goal
      if (this._item === undefined) {
        this.takeItem("B");
        this.simulation.print();
      } else {
        this.placeItem(this.objective);
        // Update objectives list
        delete this.simulation.objectives[this.objective];
        this.sortedObjectives.shift();
        this.objective = this.sortedObjectives[0];
        this.simulation.print();
      }
    }
  }

  // Calculate where to place algorithm
  // case for each direction
  // this.placeItem([
  //   this.getPosition()[0] + x,
  //   this.getPosition()[1] + y,
  // ])
}

/**
 * Checks whether two arrays are identical.
 * Code taken from https://stackoverflow.com/questions/4025893/how-to-check-identical-array-in-most-efficient-way
 * @param {Array} arr1 An array
 * @param {Array} arr2 Another array
 */
function arraysEqual(arr1, arr2) {
  if (arr1 === undefined || arr2 === undefined) {
    return false;
  } else if (arr1.length !== arr2.length) {
    return false;
  }
  for (let i = arr1.length; i--; ) {
    if (arr1[i] !== arr2[i]) {
      return false;
    }
  }
  return true;
}

/**
 * Taken from https://stackoverflow.com/questions/41661287/how-to-check-if-an-array-contains-another-array
 * Checks if an array contains the given item. Used when the item is an array.
 * @param {Array} arr  An Array containing Arrays
 * @param {Array} item An Array which might be contained in arr
 */
export function arrayHolds(arr, item) {
  let itemAsString = JSON.stringify(item);
  let contains = arr.some(function(ele) {
    return JSON.stringify(ele) === itemAsString;
  });
  return contains;
}

/**
 * Returns the index of an array contained within an array, or -1 if not found.
 * @param  {Array}   containerArray The Array to search in.
 * @param  {Array}   findArray      The Array to search for.
 * @return {Integer}                The index of findArray, or -1.
 */
export function getArrayIndex(containerArray, findArray) {
  if (
    Array.isArray(containerArray) === false ||
    Array.isArray(findArray) === false
  ) {
    throw new Error(
      "Parameters " +
        containerArray +
        " and " +
        findArray +
        " must both be Arrays."
    );
  }
  for (let i = containerArray.length; i--; ) {
    if (
      JSON.stringify(containerArray[i][0]) === JSON.stringify(findArray[0]) &&
      JSON.stringify(containerArray[i][1]) === JSON.stringify(findArray[1])
    ) {
      return i;
    }
  }
  return -1;
}
