// !!!TO DO: modify timing of trial to be 5 seconds for purposes of playback file collection. fix bugs

import { JsPsych, JsPsychPlugin, ParameterType, TrialType } from "jspsych";

import { version } from "../package.json";

const info = <const>{
  name: "plugin-moving-dots",
  version: version,
  parameters: {
    /** Maximum initial distance from the center location for dots */
    max_initial_distance: {
      type: ParameterType.INT,
      default: 45,
    },
    /** Duration of the flash in milliseconds */
    flash_duration: {
      type: ParameterType.INT,
      default: 200,
    },
    /** Delay before the dot flashes in milliseconds */
    pre_flash_duration: {
      type: ParameterType.INT,
      default: 2500,
    },
    /** Duration of the post-flash in milliseconds */
    post_flash_duration: {
      type: ParameterType.INT,
      default: 1500,
    },
    /** Initial level of control the mouse has over the dots (0-100) */
    initial_control_level: {
      type: ParameterType.INT,
      default: 100,
    },
    /** Change in the level of control of the flashing dot after it changes (0-100) */
    control_change_level: {
      type: ParameterType.INT,
      default: 30,
    },
    /** Height of the diodes on the side of the screen */
    diode_heights: {
      type: ParameterType.INT,
      array: true,
      default: [10, 70, 130]
    },
    /** Whether the trial is a practice trial */
    practice_trial: {
      type: ParameterType.BOOL,
      default: false
    },
    /** 2-dimensional array of mouse data for playback */
    playback: {
      type: ParameterType.COMPLEX,
      array: true,
      default: [] as Array<{ dx: number; dy: number }>,
      params: {
        dx: {
          type: ParameterType.INT,
        },
        dy: {
          type: ParameterType.INT,
        }
      },
    },
  },
  data: {
    /** Magnitude of the control change (e.g., 30, 70, 100) */
    control_change: {
      type: ParameterType.INT,
    },
    mouse_data: {
      type: ParameterType.COMPLEX,
      array: true,
      nested: {
        /** Change in x position of the mouse */
        dx: {
          type: ParameterType.INT,
        },
        /** Change in y position of the mouse */
        dy: {
          type: ParameterType.INT,
        },
      },
    }
  },
  // When you run build on your plugin, citations will be generated here based on the information in the CITATION.cff file.
  citations: "__CITATIONS__",
};

type Info = typeof info;

/**
 * **plugin-moving-dots**
 *
 * Handles moving series of dots that move at the same speed in response to user input; one dot will flash red and change its control level. Implemented as part of an experiment for COGS-219; replicating the paper "Control Changes the Way We Look at the World" by Wen & Haggard.
 *
 * @author Ollie & Noah
 * @see {@link /plugin-moving-dots-2/README.md}
 */
class MovingDotsPlugin implements JsPsychPlugin<Info> {
  static info = info;

  constructor(private jsPsych: JsPsych) {}

  trial(display_element: HTMLElement, trial: TrialType<Info>) {
    // Create a canvas to display the dots
    const canvas = document.createElement("canvas");

    // Change canvas size to window size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    display_element.appendChild(canvas);
    const ctx = canvas.getContext("2d");

    // Initialize dot positions and control levels
    const dots: { x: number; y: number; control: number }[] = [];

    // Flash one dot and change its control level after a random delay
    const flashIndex = 0;
    const controlChange = trial.control_change_level;

    let flashStartTime: number | null = null;
    let hasFlashed = false;
    let isFlashing = false;

    const data = [];
    let frame = 0;

    let startTime = Date.now();
    let lastFrameTime = startTime;

    // Handle mouse/touchpad input
    let dx = 0;
    let dy = 0;

    // let isFirstMove = true;

    // const initializeDots = () => {
    //   for (let i = 0; i < 10; i++) {
    //     const angle = Math.random() * 2 * Math.PI;
    //     const distance = Math.random() * trial.max_initial_distance;
    //     dots.push({
    //       x: canvas.width / 2 + distance * Math.cos(angle),
    //       y: canvas.height / 2 + distance * Math.sin(angle),
    //       control: trial.initial_control_level, // Initial control level
    //     });
    //   }
    // };

    const initializeDots = () => {
      const minDistance = 7; // Minimum distance between dots
    
      for (let i = 0; i < 10; i++) {
        let newDot;
        let validPosition = false;
    
        // Try to find a valid position for the new dot
        while (!validPosition) {
          const angle = Math.random() * 2 * Math.PI;
          const distance = Math.random() * trial.max_initial_distance;
          newDot = {
            x: canvas.width / 2 + distance * Math.cos(angle),
            y: canvas.height / 2 + distance * Math.sin(angle),
            control: trial.initial_control_level, // Initial control level
          };
    
          // Check if the new dot is too close to any existing dots
          validPosition = true;
          for (const existingDot of dots) {
            const dx = newDot.x - existingDot.x;
            const dy = newDot.y - existingDot.y;
            const distanceBetween = Math.sqrt(dx * dx + dy * dy);
            if (distanceBetween < minDistance) {
              validPosition = false;
              break;
            }
          }
        }
        dots.push(newDot);
      }
    };

    const createSignalBoxes = () => {
      const box1 = document.createElement("div");
      const box2 = document.createElement("div");
      const box3 = document.createElement("div");
      const box4 = document.createElement("div");

      box1.style.position = "fixed";
      box1.style.bottom = `${trial.diode_heights[0]}px`;
      box1.style.right = "50px";
      box1.style.height = "5vh";
      box1.style.width = "5vh";
      box1.style.backgroundColor = "black";

      box2.style.position = "fixed";
      box2.style.bottom = `${trial.diode_heights[1]}px`;
      box2.style.right = "50px";
      box2.style.height = "5vh";
      box2.style.width = "5vh";
      box2.style.backgroundColor = "black";

      box3.style.position = "fixed";
      box3.style.bottom = `${trial.diode_heights[2]}px`;
      box3.style.right = "50px";
      box3.style.height = "5vh";
      box3.style.width = "5vh";
      box3.style.backgroundColor = "black";

      display_element.appendChild(box1);
      display_element.appendChild(box2);
      display_element.appendChild(box3);

      return [box1, box2, box3];
    }
    const [box1, box2, box3] = createSignalBoxes();

    // Render dots, cross, and control value
    const renderDotsAndCross = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Render cross at the center
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2 - 10, canvas.height / 2);
      ctx.lineTo(canvas.width / 2 + 10, canvas.height / 2);
      ctx.moveTo(canvas.width / 2, canvas.height / 2 - 10);
      ctx.lineTo(canvas.width / 2, canvas.height / 2 + 10);
      ctx.strokeStyle = "black";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Render dots
      dots.forEach((dot, index) => {
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, 3.5, 0, 2 * Math.PI);
        if (isFlashing) {
          ctx.fillStyle = index === flashIndex ? "red" : "black";
        } else {
          ctx.fillStyle = "black";
        }
        ctx.fill();
      });
    };

    const mouseMoveListener = (e: MouseEvent) => {
      dx = e.movementX;
      dy = e.movementY;
    };

    // Function to calculate new dx and dy
    const doTheMath = (
      inputDX: number,
      inputDY: number,
      playbackDX: number,
      playbackDY: number,
      control: number
    ) => {

      const epsilon = 0.00001; // a small constant to prevent division by zero

      // get magnitude of mouse vector
      const mySpeed = Math.sqrt(Math.pow(inputDX, 2) + Math.pow(inputDY, 2)) + epsilon;
      
      // get unit vector of mouse vector
      const unitVector = { x: inputDX / mySpeed, y: inputDY / mySpeed };

      // get magnitude of playback vector
      const playbackSpeed = Math.sqrt(
        Math.pow(playbackDX, 2) + Math.pow(playbackDY, 2)
      ) + epsilon;

      // get unit vector of playback vector
      const playbackUnitVector = {
        x: playbackDX / playbackSpeed,
        y: playbackDY / playbackSpeed,
      };

      // blend the two vectors based on control
      // if control is 1 (100%), use only the mouse vector
      // if control is 0, use only the playback vector

      const newDX = (control * unitVector.x + (1 - control) * playbackUnitVector.x) * mySpeed;
      const newDY = (control * unitVector.y + (1 - control) * playbackUnitVector.y) * mySpeed;
      
      return { newDX, newDY };
    };

    // Update dot positions based on control
    const updateDots = (vx: number, vy: number) => {
      dots.forEach((dot) => {
        const { newDX, newDY } = doTheMath(
          vx,
          vy,
          trial.playback[frame].dx,
          trial.playback[frame].dy,
          dot.control / 100
        );
        dot.x += newDX;
        dot.y += newDY;
      });
    };

    // End trial
    const endTrial = () => {
      document.exitPointerLock();
      canvas.removeEventListener("mousemove", mouseMoveListener);
      display_element.innerHTML = ""; // Clear the canvas
      this.jsPsych.finishTrial({
        control_change: controlChange,
        mouse_data: data,
      });
    };

    
    const flashBoxes = () => {
      if(trial.practice_trial){
        box1.style.backgroundColor = "white";
        box2.style.backgroundColor = "white";
        box3.style.backgroundColor = "white";
        return;
      } 

      if(trial.initial_control_level === 100){
        box1.style.backgroundColor = "white";
        if(trial.control_change_level === 70){
          box3.style.backgroundColor = "white";
        }
        if(trial.control_change_level === 100){
          box2.style.backgroundColor = "white";
        }
      }
      if(trial.initial_control_level === 0){
        if(trial.control_change_level === 30){
          box3.style.backgroundColor = "white";
        }
        if(trial.control_change_level === 70){
          box2.style.backgroundColor = "white";
        }
        if(trial.control_change_level === 100){
          box2.style.backgroundColor = "white";
          box3.style.backgroundColor = "white";
        }
      }
    }

    const resetBoxes = () => {
      box1.style.backgroundColor = "black";
      box2.style.backgroundColor = "black";
      box3.style.backgroundColor = "black";
    }

    const animate = () => {
      const currentTime = Date.now();
      const elapsedTime = currentTime - startTime;

      lastFrameTime = currentTime;

      // working backwards from the end of the trial
      
      // check if the trial is over
      if(elapsedTime >= trial.pre_flash_duration + trial.post_flash_duration) {
        endTrial();
        return;
      }

      // check if we are switching to the post-flash period
      if (isFlashing && currentTime - flashStartTime >= trial.flash_duration) {
        isFlashing = false;
        hasFlashed = true;
        resetBoxes();
      }

      // check if it is time to flash
      if (elapsedTime >= trial.pre_flash_duration && !isFlashing && !hasFlashed) {
        flashStartTime = Date.now();
        isFlashing = true;
        if (trial.initial_control_level === 100) {
          dots[flashIndex].control = dots[flashIndex].control - controlChange;
        } else if (trial.initial_control_level === 0) {
          dots[flashIndex].control = dots[flashIndex].control + controlChange;
        }
        flashBoxes();
      }

      // run the next loop of the animation
      updateDots(dx, dy);
      renderDotsAndCross();
      data.push({ dx, dy });
      dx = 0;
      dy = 0;
      frame++;
      requestAnimationFrame(animate);
    };

    initializeDots();
    renderDotsAndCross();
    canvas.requestPointerLock({ unadjustedMovement: false });
    canvas.addEventListener("mousemove", mouseMoveListener);
    animate();
  }
}

export default MovingDotsPlugin;
