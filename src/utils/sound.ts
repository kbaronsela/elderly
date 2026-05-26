// Generates an alarm sound using Web Audio API – no external file needed
let audioCtx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext()
  return audioCtx
}

export function playAlarmSound(): void {
  const ctx = getCtx()
  const notes = [523.25, 659.25, 783.99, 1046.50] // C5 E5 G5 C6

  let t = ctx.currentTime
  for (let rep = 0; rep < 3; rep++) {
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0, t + i * 0.15)
      gain.gain.linearRampToValueAtTime(0.4, t + i * 0.15 + 0.05)
      gain.gain.linearRampToValueAtTime(0, t + i * 0.15 + 0.3)
      osc.start(t + i * 0.15)
      osc.stop(t + i * 0.15 + 0.35)
    })
    t += notes.length * 0.15 + 0.4
  }
}

export function playSuccessSound(): void {
  const ctx = getCtx()
  const notes = [523.25, 659.25, 783.99, 1046.50]
  let t = ctx.currentTime
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0, t + i * 0.12)
    gain.gain.linearRampToValueAtTime(0.35, t + i * 0.12 + 0.04)
    gain.gain.linearRampToValueAtTime(0, t + i * 0.12 + 0.25)
    osc.start(t + i * 0.12)
    osc.stop(t + i * 0.12 + 0.3)
    t += 0
  })
}
