var jsPsychPluginMovingDots = (function (jspsych) {
  'use strict';

  var version = "0.0.1";

  const info = {
    name: "plugin-moving-dots",
    version,
    parameters: {
      /** Maximum initial distance from the center location for dots */
      max_initial_distance: {
        type: jspsych.ParameterType.INT,
        default: 45
      },
      /** Duration of the flash in milliseconds */
      flash_duration: {
        type: jspsych.ParameterType.INT,
        default: 200
      },
      /** Delay before the dot flashes in milliseconds */
      pre_flash_duration: {
        type: jspsych.ParameterType.INT,
        default: 2500
      },
      /** Duration of the post-flash in milliseconds */
      post_flash_duration: {
        type: jspsych.ParameterType.INT,
        default: 1500
      },
      /** Initial level of control the mouse has over the dots (0-100) */
      initial_control_level: {
        type: jspsych.ParameterType.INT,
        default: 100
      },
      /** Change in the level of control of the flashing dot after it changes (0-100) */
      control_change_level: {
        type: jspsych.ParameterType.INT,
        default: 30
      },
      /** Height of the diodes on the side of the screen */
      diode_heights: {
        type: jspsych.ParameterType.INT,
        array: true,
        default: [10, 70, 130]
      },
      /** Whether the trial is a practice trial */
      practice_trial: {
        type: jspsych.ParameterType.BOOL,
        default: false
      },
      /** 2-dimensional array of mouse data for playback */
      playback: {
        type: jspsych.ParameterType.COMPLEX,
        array: true,
        default: [],
        params: {
          dx: {
            type: jspsych.ParameterType.INT
          },
          dy: {
            type: jspsych.ParameterType.INT
          }
        }
      }
    },
    data: {
      /** Magnitude of the control change (e.g., 30, 70, 100) */
      control_change: {
        type: jspsych.ParameterType.INT
      },
      mouse_data: {
        type: jspsych.ParameterType.COMPLEX,
        array: true,
        nested: {
          /** Change in x position of the mouse */
          dx: {
            type: jspsych.ParameterType.INT
          },
          /** Change in y position of the mouse */
          dy: {
            type: jspsych.ParameterType.INT
          }
        }
      }
    },
    // When you run build on your plugin, citations will be generated here based on the information in the CITATION.cff file.
    citations: "__CITATIONS__"
  };
  class MovingDotsPlugin {
    constructor(jsPsych) {
      this.jsPsych = jsPsych;
    }
    static {
      this.info = info;
    }
    trial(display_element, trial) {
      const canvas = document.createElement("canvas");
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      display_element.appendChild(canvas);
      const ctx = canvas.getContext("2d");
      const dots = [];
      const flashIndex = 0;
      const controlChange = trial.control_change_level;
      let flashStartTime = null;
      let hasFlashed = false;
      let isFlashing = false;
      const data = [];
      let frame = 0;
      let startTime = Date.now();
      let dx = 0;
      let dy = 0;
      const initializeDots = () => {
        const minDistance = 7;
        for (let i = 0; i < 10; i++) {
          let newDot;
          let validPosition = false;
          while (!validPosition) {
            const angle = Math.random() * 2 * Math.PI;
            const distance = Math.random() * trial.max_initial_distance;
            newDot = {
              x: canvas.width / 2 + distance * Math.cos(angle),
              y: canvas.height / 2 + distance * Math.sin(angle),
              control: trial.initial_control_level
              // Initial control level
            };
            validPosition = true;
            for (const existingDot of dots) {
              const dx2 = newDot.x - existingDot.x;
              const dy2 = newDot.y - existingDot.y;
              const distanceBetween = Math.sqrt(dx2 * dx2 + dy2 * dy2);
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
        const box12 = document.createElement("div");
        const box22 = document.createElement("div");
        const box32 = document.createElement("div");
        document.createElement("div");
        box12.style.position = "fixed";
        box12.style.bottom = `${trial.diode_heights[0]}px`;
        box12.style.right = "50px";
        box12.style.height = "5vh";
        box12.style.width = "5vh";
        box12.style.backgroundColor = "black";
        box22.style.position = "fixed";
        box22.style.bottom = `${trial.diode_heights[1]}px`;
        box22.style.right = "50px";
        box22.style.height = "5vh";
        box22.style.width = "5vh";
        box22.style.backgroundColor = "black";
        box32.style.position = "fixed";
        box32.style.bottom = `${trial.diode_heights[2]}px`;
        box32.style.right = "50px";
        box32.style.height = "5vh";
        box32.style.width = "5vh";
        box32.style.backgroundColor = "black";
        display_element.appendChild(box12);
        display_element.appendChild(box22);
        display_element.appendChild(box32);
        return [box12, box22, box32];
      };
      const [box1, box2, box3] = createSignalBoxes();
      const renderDotsAndCross = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2 - 10, canvas.height / 2);
        ctx.lineTo(canvas.width / 2 + 10, canvas.height / 2);
        ctx.moveTo(canvas.width / 2, canvas.height / 2 - 10);
        ctx.lineTo(canvas.width / 2, canvas.height / 2 + 10);
        ctx.strokeStyle = "black";
        ctx.lineWidth = 2;
        ctx.stroke();
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
      const mouseMoveListener = (e) => {
        dx = e.movementX;
        dy = e.movementY;
      };
      const doTheMath = (inputDX, inputDY, playbackDX, playbackDY, control) => {
        const epsilon = 1e-5;
        const mySpeed = Math.sqrt(Math.pow(inputDX, 2) + Math.pow(inputDY, 2)) + epsilon;
        const unitVector = { x: inputDX / mySpeed, y: inputDY / mySpeed };
        const playbackSpeed = Math.sqrt(
          Math.pow(playbackDX, 2) + Math.pow(playbackDY, 2)
        ) + epsilon;
        const playbackUnitVector = {
          x: playbackDX / playbackSpeed,
          y: playbackDY / playbackSpeed
        };
        const newDX = (control * unitVector.x + (1 - control) * playbackUnitVector.x) * mySpeed;
        const newDY = (control * unitVector.y + (1 - control) * playbackUnitVector.y) * mySpeed;
        return { newDX, newDY };
      };
      const updateDots = (vx, vy) => {
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
      const endTrial = () => {
        document.exitPointerLock();
        canvas.removeEventListener("mousemove", mouseMoveListener);
        display_element.innerHTML = "";
        this.jsPsych.finishTrial({
          control_change: controlChange,
          mouse_data: data
        });
      };
      const flashBoxes = () => {
        if (trial.practice_trial) {
          box1.style.backgroundColor = "white";
          box2.style.backgroundColor = "white";
          box3.style.backgroundColor = "white";
          return;
        }
        if (trial.initial_control_level === 100) {
          box1.style.backgroundColor = "white";
          if (trial.control_change_level === 70) {
            box3.style.backgroundColor = "white";
          }
          if (trial.control_change_level === 100) {
            box2.style.backgroundColor = "white";
          }
        }
        if (trial.initial_control_level === 0) {
          if (trial.control_change_level === 30) {
            box3.style.backgroundColor = "white";
          }
          if (trial.control_change_level === 70) {
            box2.style.backgroundColor = "white";
          }
          if (trial.control_change_level === 100) {
            box2.style.backgroundColor = "white";
            box3.style.backgroundColor = "white";
          }
        }
      };
      const resetBoxes = () => {
        box1.style.backgroundColor = "black";
        box2.style.backgroundColor = "black";
        box3.style.backgroundColor = "black";
      };
      const animate = () => {
        const currentTime = Date.now();
        const elapsedTime = currentTime - startTime;
        if (elapsedTime >= trial.pre_flash_duration + trial.post_flash_duration) {
          endTrial();
          return;
        }
        if (isFlashing && currentTime - flashStartTime >= trial.flash_duration) {
          isFlashing = false;
          hasFlashed = true;
          resetBoxes();
        }
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

  return MovingDotsPlugin;

})(jsPsychModule);
//# sourceMappingURL=index.browser.js.map
