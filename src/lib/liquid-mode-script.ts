/** The localStorage key holding liquid mode ("on" when enabled). */
export const LIQUID_MODE_KEY = "liquid"

/** Runs before paint, so a liquid page never flashes without its glass. */
export const liquidModeScript = `try{if(localStorage.getItem("${LIQUID_MODE_KEY}")==="on")document.documentElement.classList.add("liquid")}catch(e){}`
