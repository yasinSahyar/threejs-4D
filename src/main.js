import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

let scene, camera, renderer, controls
let snowParticles
let leftEye, rightEye, nose
let blinkTimer = 0
let mouse = new THREE.Vector2(0, 0)

init()
animate()

function init() {
  // Scene
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x87ceeb)

  // Camera
  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  )
  camera.position.set(0, 3, 8)

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  document.getElementById('app').appendChild(renderer.domElement)

  // Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
  dirLight.position.set(5, 10, 7)
  const hemiLight = new THREE.HemisphereLight(0xffffbb, 0x080820, 0.6)
  scene.add(ambientLight, dirLight, hemiLight)

  // Axis helper
  scene.add(new THREE.AxesHelper(5))

  // Ground
  const groundGeo = new THREE.PlaneGeometry(20, 20)
  const groundMat = new THREE.MeshPhongMaterial({ color: 0xffffff })
  const ground = new THREE.Mesh(groundGeo, groundMat)
  ground.rotation.x = -Math.PI / 2
  scene.add(ground)

  // Materials
  const bodyMat = new THREE.MeshPhongMaterial({ color: 0xf2f2f2 })
  const eyeMat = new THREE.MeshPhongMaterial({ color: 0x000000 })
  const noseMat = new THREE.MeshPhongMaterial({ color: 0xff6600 })
  const hatMat = new THREE.MeshPhongMaterial({ color: 0x111111 })
  const scarfMat = new THREE.MeshPhongMaterial({ color: 0xff0000 })
  const buttonMat = new THREE.MeshPhongMaterial({ color: 0x333333 })

  // Body
  const bottom = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 32), bodyMat)
  bottom.position.set(0, 1, 0)
  scene.add(bottom)

  const middle = new THREE.Mesh(new THREE.SphereGeometry(0.7, 32, 32), bodyMat)
  middle.position.set(0, 2.3, 0)
  scene.add(middle)

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 32), bodyMat)
  head.position.set(0, 3.3, 0)
  scene.add(head)

  // Eyes
  leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 16), eyeMat)
  leftEye.position.set(-0.15, 3.35, 0.45)
  rightEye = leftEye.clone()
  rightEye.position.x = 0.15
  scene.add(leftEye, rightEye)

  // Nose
  nose = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.4, 16), noseMat)
  nose.rotation.x = Math.PI / 2
  nose.position.set(0, 3.3, 0.55)
  scene.add(nose)

  // Buttons
  for (let i = 0; i < 3; i++) {
    const button = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 16), buttonMat)
    button.position.set(0, 2.1 - i * 0.4, 0.68)
    scene.add(button)
  }

  // Scarf
  const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.08, 12, 24), scarfMat)
  scarf.rotation.x = Math.PI / 2
  scarf.position.set(0, 2.9, 0)
  scene.add(scarf)

  // Hat
  const hatBase = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.1, 24), hatMat)
  hatBase.position.set(0, 3.6, 0)
  const hatTop = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.6, 24), hatMat)
  hatTop.position.set(0, 3.95, 0)
  scene.add(hatBase, hatTop)

  // Orbit controls
  controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(0, 2, 0)
  controls.enableDamping = true

  // Snow
  createSnow()

  // Mouse hareketini dinle
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('resize', onWindowResize)
}

// ❄️ Snow Particles
function createSnow() {
  const snowCount = 1000
  const positions = new Float32Array(snowCount * 3)
  for (let i = 0; i < snowCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 20
    positions[i * 3 + 1] = Math.random() * 10 + 2
    positions[i * 3 + 2] = (Math.random() - 0.5) * 20
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.08,
    transparent: true,
    opacity: 0.9
  })

  snowParticles = new THREE.Points(geometry, material)
  scene.add(snowParticles)
}

// 🖱️ Fare hareketi — normalize edilmiş koordinatlar
function onMouseMove(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1
}

// 🎬 Animate
function animate() {
  requestAnimationFrame(animate)
  controls.update()

  // Kar düşüşü
  if (snowParticles) {
    const pos = snowParticles.geometry.attributes.position
    for (let i = 0; i < pos.count; i++) {
      pos.array[i * 3 + 1] -= 0.03
      if (pos.array[i * 3 + 1] < 0) pos.array[i * 3 + 1] = 10 + Math.random() * 2
    }
    pos.needsUpdate = true
  }

  // 👁️ Göz kırpma
  blinkTimer += 0.05
  const blink = Math.abs(Math.sin(blinkTimer * 0.5))
  const scaleY = THREE.MathUtils.lerp(0.2, 1, blink)
  leftEye.scale.set(1, scaleY, 1)
  rightEye.scale.set(1, scaleY, 1)

  // 🥕 Burun dönüyor
  nose.rotation.z += 0.02

  // 👀 Gözler fareyi izliyor
  const lookX = THREE.MathUtils.clamp(mouse.x * 0.3, -0.2, 0.2)
  const lookY = THREE.MathUtils.clamp(mouse.y * 0.3, -0.1, 0.2)
  leftEye.position.set(-0.15 + lookX, 3.35 + lookY, 0.45)
  rightEye.position.set(0.15 + lookX, 3.35 + lookY, 0.45)

  renderer.render(scene, camera)
}

// 📏 Resize
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}
