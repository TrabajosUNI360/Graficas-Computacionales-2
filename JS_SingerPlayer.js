import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js'; // Importar el FBXLoader

// Crear la escena, cámara y renderizado
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Cargar música de ambiente
const audioListener = new THREE.AudioListener();
camera.add(audioListener); // Añadir el listener de audio a la cámara

const ambientMusic = new THREE.Audio(audioListener); // Crear un objeto de audio para la música
const audioLoader = new THREE.AudioLoader(); // Crear un cargador de audio
audioLoader.load('cancion.mp3', function(buffer) { // Cargar el archivo de audio
    ambientMusic.setBuffer(buffer);
    ambientMusic.setLoop(true); // Hacer que la música se repita
    ambientMusic.setVolume(0.3); // Ajustar el volumen (0 a 1)
    ambientMusic.play(); // Reproducir la música
});

// Cargar una imagen como fondo
const textureLoader = new THREE.TextureLoader();
const backgroundTexture = textureLoader.load('fondo.png'); // Especifica la ruta a tu imagen
scene.background = backgroundTexture; // Asignar la textura como fondo

// Cargar el archivo MTL primero para el escenario
const mtlLoader = new MTLLoader();
mtlLoader.load('escenario2/fighting_polygon_stage.mtl', function (materials) {
    materials.preload(); // Precargar los materiales

    // Cargar el modelo OBJ del escenario
    const objLoader = new OBJLoader();
    objLoader.setMaterials(materials); // Asignar los materiales cargados
    objLoader.load('escenario2/fighting_polygon_stage.obj', function (object) {
        scene.add(object); // Añadir el escenario a la escena
        object.position.set(2, 0, 3.1); // Ajustar posición si es necesario
    }, undefined, function (error) {
        console.error('Error al cargar el modelo del escenario:', error);
    });
});

// Variables para el modelo de Mario y la animación
let mario;
let mixer; // Mezclador de animaciones
let runAction, idleAction; // Nuevas acciones para la animación de correr y reposo
let runActionReady = false; // Verificar si la animación de correr está lista
const clock = new THREE.Clock(); // Reloj para controlar el tiempo de las animaciones
let jumpAction;
let jumpActionReady = false;

// Cargar el modelo de Mario desde un archivo FBX
const fbxLoader = new FBXLoader();
fbxLoader.load('stand.fbx', function (object) {
    mario = object; // Guardar el modelo de Mario
    scene.add(mario);
    mario.position.set(1, 1.1, 3.8); // Ajustar la posición de Mario en el escenario
    
    // Especificar el ángulo de rotación en grados
    let rotationDegrees = 93; // Cambia este valor según necesites
    mario.rotation.y = THREE.MathUtils.degToRad(rotationDegrees); // Rota en el eje Y
    
    // Inicializar el mezclador de animaciones
    mixer = new THREE.AnimationMixer(mario);
    idleAction = mixer.clipAction(object.animations[0]); // Animación en reposo
    idleAction.play(); // Iniciar la animación en reposo

    // Cargar la animación de correr desde 'Run.fbx'
    fbxLoader.load('Run.fbx', function (runObject) {
        runAction = mixer.clipAction(runObject.animations[0]); // Cargar la animación de correr
        runAction.loop = THREE.LoopRepeat; // Configurar la animación para repetirse
        runActionReady = true; // Indicar que la animación de correr está lista
    }, undefined, function (error) {
        console.error('Error al cargar la animación de correr:', error);
    });

    // Cargar la animacion de salto desde 'Jump.fbx'
    fbxLoader.load('Jump.fbx', function(jumpObject){
        jumpAction = mixer.clipAction(jumpObject.animations[0]);
        jumpAction.loop = THREE.LoopRepeat;
        jumpActionReady = true;
    }, undefined, function (error){
        console.error('Error al cargar la animacion de saltar: ', error);
    });

}, undefined, function (error) {
    console.error('Error al cargar el modelo de Mario:', error);
});

// Variables para el movimiento de Mario
const keys = {
    left: false,
    right: false,
    jump: false,
    isRunning: false, // Para controlar el estado de correr
};

/*Variables de Mario*/
let velocityY = 0; // Velocidad vertical para el salto
const gravity = -0.01; // Fuerza de gravedad
const jumpForce = 0.2; // Fuerza del salto
const groundLevel = 1.1; // Altura del suelo
const jumpLimit = 1.9; // Altura máxima del salto
let isJumping = false; // Para controlar el estado de salto
let isFalling = false; // Para controlar el estado de caída

// Cargar el sonido de salto
const jumpSound = new THREE.Audio(audioListener); // Crear un objeto de audio para el salto
audioLoader.load('yahoo.wav', function(buffer) {
    jumpSound.setBuffer(buffer); // Establecer el buffer de sonido
    jumpSound.setVolume(0.5); // Ajustar el volumen (0 a 1)
});

// Cargar el sonido de caída
const fallSound = new THREE.Audio(audioListener); // Crear un objeto de audio para la caída
audioLoader.load('gritoMario.wav', function(buffer) {
    fallSound.setBuffer(buffer); // Establecer el buffer de sonido
    fallSound.setVolume(0.5); // Ajustar el volumen (0 a 1)
});

/*Funciones para animaciones de Mario*/
// Cambiar a la animación de correr
function switchToRunAnimation() {
    if (runActionReady && runAction && !keys.isRunning) {
        idleAction.stop(); // Detener la animación en reposo
        runAction.play();  // Iniciar la animación de correr
        keys.isRunning = true;
        keys.isJumping = false;
    }
}

// Cambiar a la animación de reposo
function switchToIdleAnimation() {
    if (keys.isRunning || keys.isJumping) {
        runAction.stop();  // Detener la animación de correr
        jumpAction.stop(); // Detener la animacion de salto
        idleAction.play(); // Volver a la animación en reposo
        keys.isRunning = false;
        keys.isJumping = false;
    }
}

// Cambiar a la animacion de salto
function switchToJumpAnimation(){
    if(jumpAction && jumpActionReady && !keys.isJumping){
        idleAction.stop();
        jumpAction.play();
        keys.isJumping = true;
        keys.isRunning = false;
    }
}

// Manejar eventos de teclado de Mario
window.addEventListener('keydown', function (event) {
    switch (event.code) {
        case 'KeyA':
            keys.left = true;
            switchToRunAnimation(); // Cambiar a la animación de correr
            break;
        case 'KeyD':
            keys.right = true;
            switchToRunAnimation(); // Cambiar a la animación de correr
            break;
        case 'KeyW':
            // Emitir sonido al saltar
            if (mario && mario.position.y <= groundLevel) { // Solo permitir saltar si está en el suelo
                keys.jump = true;
                velocityY = jumpForce; // Establecer la velocidad de salto
                isJumping = true; // Indicar que Mario está saltando
            }
            jumpSound.play(); // Reproducir el sonido al saltar, sin importar el estado
            switchToJumpAnimation();
            break;
    }
});

window.addEventListener('keyup', function (event) {
    switch (event.code) {
        case 'KeyA':
            keys.left = false;
            if (!keys.right) switchToIdleAnimation(); // Cambiar a la animación en reposo
            break;
        case 'KeyD':
            keys.right = false;
            if (!keys.left) switchToIdleAnimation(); // Cambiar a la animación en reposo
            break;
        case 'KeyW':
            keys.jump = false;
            if(!keys.jump) switchToIdleAnimation(); // Cambiar a la animacion en reposo
            break;
    }
});

// Función para detectar colisión entre Mario y Luigi
function checkCollision() {
    const threshold = 0.3; // Distancia mínima para considerar una colisión

    const marioPosition = new THREE.Vector3(mario.position.x, mario.position.y, mario.position.z);

}

// Función para manejar lo que ocurre cuando hay una colisión
function handleCollision() {

    keys.left = false;
    keys.right = false;
 


    mario.position.x -= 0.1; // Retroceder a Mario

}

// Posicionar la cámara
camera.position.z = 5;
camera.position.x = 2;
camera.position.y = 1.5;

// Añadir luz ambiental (natural y suave)
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // Luz blanca suave (50% de intensidad)
scene.add(ambientLight);

// Añadir luz hemisférica para simular el cielo (más natural)
const hemiLight = new THREE.HemisphereLight(0xffffbb, 0x080820, 1); // Color del cielo y la tierra, con intensidad 1
scene.add(hemiLight);

// Luz direccional suave para mejorar las sombras y el brillo
const dl = new THREE.DirectionalLight(0xffffff, 0.8); // Luz direccional blanca con 80% de intensidad
dl.position.set(0, 5, 10); // Posicionar la luz
scene.add(dl);

// Variables para la velocidad de movimiento
const movementSpeed = 0.03; // Velocidad de movimiento (ajusta este valor según necesites)

// Animar la escena
function animate() {
    requestAnimationFrame(animate);

    // Actualizar el mezclador de animaciones
    if (mixer) {
        const delta = clock.getDelta(); // Calcular el tiempo desde la última llamada
        mixer.update(delta); // Actualizar el mezclador
    }

    // Definir los ángulos de rotación
    const defaultRotation = THREE.MathUtils.degToRad(93); // Rotación predeterminada en radianes
    const leftRotationLimit = THREE.MathUtils.degToRad(-93); // Límite de rotación a la izquierda en radianes
    const rotationSpeed = 0.30; // Velocidad de rotación (ajusta este valor según necesites)

    // Movimiento de Mario
    if (mario) {
        if (keys.left) {
            mario.position.x -= movementSpeed; // Mover a la izquierda
            if (mario.rotation.y > leftRotationLimit) {
                mario.rotation.y -= rotationSpeed; // Girar hacia la izquierda
            } else {
                mario.rotation.y = leftRotationLimit; // Asegurarse de no sobrepasar el límite
            }
        }
        if (keys.right) {
            mario.position.x += movementSpeed; // Mover a la derecha
            if (mario.rotation.y < defaultRotation) {
                mario.rotation.y += rotationSpeed; // Girar hacia la derecha
            } else {
                mario.rotation.y = defaultRotation; // Asegurarse de no sobrepasar el límite
            }
        }

        // Comprobar si Mario cae al vacío
        if (mario.position.x <= 0.5) {
            // Hacer que Mario descienda lentamente hasta -2
            if (mario.position.y > -2) {
                mario.position.y -= 0.05; // Ajustar la velocidad de descenso
            } else {
                // Reaparecer en la posición deseada
                mario.position.set(1, 2, 3.8); // Reaparecer en Y = 2, X = 1
                isFalling = true; // Indicar que Mario está cayendo
            }
        }

        // Si está cayendo, descender hasta Y = 1.1
        if (isFalling) {
            if (mario.position.y > groundLevel) {
                mario.position.y -= 0.05; // Desciende lentamente hacia 1.1
            }
            if (mario.position.y <= groundLevel) {
                mario.position.y = groundLevel; // Ajustar a la altura del suelo
                isFalling = false; // Detener la caída
            }
        }

        // Comprobar si Mario desciende cuando X >= 3.5
        if (mario.position.x >= 3.5) {
            if (mario.position.y > -2) {
                mario.position.y -= 0.03; // Ajustar la velocidad de descenso
            } else {
                // Reaparecer en la posición deseada
                mario.position.set(1, 2, 3.8); // Reaparecer en Y = 2, X = 1
                isFalling = true; // Indicar que Mario está cayendo
            }
        }

        // Manejo del salto de Mario
        if (isJumping) {
            velocityY += gravity; // Aplicar gravedad
            mario.position.y += velocityY; // Actualizar posición Y

            // Comprobar si Mario ha alcanzado la altura máxima
            if (mario.position.y >= jumpLimit) {
                velocityY = 0; // Detener el movimiento hacia arriba
            }

            // Comprobar si Mario ha aterrizado
            if (mario.position.y <= groundLevel) {
                mario.position.y = groundLevel; // Mantenerlo en el suelo
                velocityY = 0; // Resetear la velocidad
                isJumping = false; // Indicar que Mario ha dejado de saltar
            }
        }

        // Si está cayendo, descender hasta Y = 1.1
        if (isFalling) {
            if (mario.position.y > groundLevel) {
                mario.position.y -= 0.03; // Desciende lentamente hacia 1.1
                // Reproducir el sonido de caída solo una vez
                if (!fallSound.isPlaying) { // Comprobar si el sonido no está sonando
                    fallSound.play(); // Reproducir el sonido de caída
                }
            }
            if (mario.position.y <= groundLevel) {
                mario.position.y = groundLevel; // Ajustar a la altura del suelo
                velocityY = 0; // Resetear la velocidad
                isFalling = false; // Detener la caída
                // No detener el sonido de caída aquí
            }
        } else {
            // Comprobar si Mario está en la posición de aterrizaje y sigue reproduciendo el sonido
            if (mario.position.x === 1 && fallSound.isPlaying) {
                // Asegurarse de que el sonido siga reproduciéndose
                fallSound.play(); // Reproducir el sonido de caída si está en la posición X de 1
            }
        }
    }

    // Comprobar colisiones entre Mario y Luigi
    checkCollision();

    renderer.render(scene, camera);
}
animate();
