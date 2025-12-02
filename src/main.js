// Gerekli Three.js Kütüphanelerini İçe Aktarma
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
// Kendi utils dosyanızdan import edilen VR yardımcıları
import { VRButton } from './utils/VRButton.js';
import { XRControllerModelFactory } from './utils/XRControllerModelFactory.js';


// --- SAHNE KURULUMU ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x505050);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1.6, 3); // VR başlangıç pozisyonu

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = THREE.sRGBEncoding;

// --- VR (WebXR) Etkinleştirme ---
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

// Işıklar
scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
dirLight.position.set(0, 5, 2);
scene.add(dirLight);

// Zemin
const floorGeometry = new THREE.PlaneGeometry(10, 10);
floorGeometry.rotateX(- Math.PI / 2);
const floorMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc });
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
scene.add(floor);


// --- KONTROL VE ETKİLEŞİM NESNELERİ ---
let grabObjects = []; // Yakalanabilir nesneler listesi

// Modelleri Yükle ve Yakalanabilir Yap
const loader = new GLTFLoader();
loader.load('public/model/RobotExpressive.glb', function (gltf) {
    const model = gltf.scene;
    model.position.set(0, 1, -1);
    model.scale.set(0.5, 0.5, 0.5);
    scene.add(model);
    grabObjects.push(model);

    // Test amaçlı ek bir küp (Kendi modeliniz)
    const box = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.3, 0.3),
        new THREE.MeshStandardMaterial({ color: 0xff0000 })
    );
    box.position.set(1, 1.2, -1.5);
    scene.add(box);
    grabObjects.push(box);
});

// --- VR KONTROLCÜLERİ VE RAYCASTING ---
const raycaster = new THREE.Raycaster();
const tempMatrix = new THREE.Matrix4();
let intersected = []; // Vurgulanan nesneler listesi

const controllerModelFactory = new XRControllerModelFactory();

// Görsel Işınlar için temel geometri ve materyal
const lineGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1)
]);
const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 3 });


// KONTROLCÜ 1 (SOL EL)
const controller1 = renderer.xr.getController(0);
controller1.addEventListener('selectstart', onSelectStart);
controller1.addEventListener('selectend', onSelectEnd);
scene.add(controller1);

const controllerGrip1 = renderer.xr.getControllerGrip(0);
controllerGrip1.add(controllerModelFactory.createControllerModel(controllerGrip1));
scene.add(controllerGrip1);

const line1 = new THREE.Line(lineGeometry, lineMaterial);
line1.scale.z = 5;
controller1.add(line1); // Kontrolcü 1'e çizgiyi ekle


// KONTROLCÜ 2 (SAĞ EL)
const controller2 = renderer.xr.getController(1);
controller2.addEventListener('selectstart', onSelectStart);
controller2.addEventListener('selectend', onSelectEnd);
scene.add(controller2);

const controllerGrip2 = renderer.xr.getControllerGrip(1);
controllerGrip2.add(controllerModelFactory.createControllerModel(controllerGrip2));
scene.add(controllerGrip2);

const line2 = new THREE.Line(lineGeometry, lineMaterial);
line2.scale.z = 5;
controller2.add(line2); // Kontrolcü 2'ye çizgiyi ekle


// ------------------------------------
// YAKALAMA MANTIĞI FONKSİYONLARI
// ------------------------------------

function onSelectStart(event) {
    const controller = event.target;
    const intersections = getIntersections(controller);

    if (intersections.length > 0) {
        let object = intersections[0].object;

        // Yakalanabilir en üst seviye nesneyi bul (GLTF Modelleri için gerekli)
        while (object.parent !== scene && object.parent !== controller && object.parent) {
             // Eğer bu üst nesne yakalanabilir listemizdeyse dur
            if (grabObjects.includes(object)) break;
            object = object.parent;
        }

        // Nesneyi kontrolcüye bağla (Yakalama)
        controller.attach(object);
        controller.userData.selected = object; // Yakalanan nesneyi kaydet
    }
}

function onSelectEnd(event) {
    const controller = event.target;

    if (controller.userData.selected !== undefined) {
        const object = controller.userData.selected;

        // Nesneyi ana sahneye geri bağla (Bırakma)
        scene.attach(object);
        controller.userData.selected = undefined;
    }
}

function getIntersections(controller) {
    // Kumandanın matrisini kullanarak Raycaster'ı ayarla
    tempMatrix.identity().extractRotation(controller.matrixWorld);
    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix); // -Z yönü

    // Yakalanabilir nesnelerle kesişimleri bul
    return raycaster.intersectObjects(grabObjects, true); // true, alt nesneleri de kontrol eder
}

// ------------------------------------
// ANIMATION DÖNGÜSÜ VE VURGULAMA
// ------------------------------------

function handleController(controller) {
    // İlk çocuk nesnenin ışın olduğunu varsayıyoruz
    const line = controller.children[0];
    const defaultColor = new THREE.Color(0xffffff);

    // Geçici olarak vurgulanan nesnenin vurgulamasını kaldır
    if (intersected.length > 0) {
        const object = intersected[0];
        if (object.material && object.material.emissive) {
            object.material.emissive.setHex(0x000000); // Emissiv rengi sıfırla
        }
        intersected.splice(0, 1);
    }
    line.scale.z = 5; // Varsayılan ışın uzunluğu

    if (controller.userData.selected === undefined) {
        // Nesne yakalanmamışsa ışın kontrolü yap
        const intersections = getIntersections(controller);

        if (intersections.length > 0) {
            const intersection = intersections[0];
            let object = intersection.object;

            // En üst seviye yakalanabilir nesneyi bul
            while (object.parent !== scene && object.parent !== controller && object.parent) {
                if (grabObjects.includes(object)) break;
                object = object.parent;
            }

            // Vurgulama
            if (object.material && object.material.emissive) {
                object.material.emissive.setHex(0xaaaaaa);
                intersected.push(object);
            }

            // Işın uzunluğunu çarpma noktasına kadar kısalt
            line.scale.z = intersection.distance;

            // Çarptığında ışın rengini değiştir (Yeşil)
            line.material.color.setHex(0x00ff00);
        } else {
            // Çarpma yoksa rengi varsayılana döndür
            line.material.color.copy(defaultColor);
        }
    }
}

function animate() {
    renderer.setAnimationLoop(() => {
        // Kontrolcülerin durumunu her döngüde güncelle
        handleController(controller1);
        handleController(controller2);

        renderer.render(scene, camera);
    });
}

animate();

// Pencere boyutunu otomatik ayarlama
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
