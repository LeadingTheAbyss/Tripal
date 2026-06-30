'use client';

import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, Sparkles, Search, Globe, ChevronDown, Train, Map } from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Register GSAP Plugin
    gsap.registerPlugin(ScrollTrigger);

    const handleMouseMove = (e: MouseEvent) => {
      // Calculate normalized X position (-0.5 to 0.5) and invert it for natural parallax
      const xPos = (e.clientX / window.innerWidth - 0.5) * -100; 
      gsap.to('.clouds', {
        x: xPos,
        duration: 1.5,
        ease: 'power2.out'
      });
    };
    window.addEventListener('mousemove', handleMouseMove);



    let renderer: THREE.WebGLRenderer;
    let sceneObj: any;

    class Scene {
      views: any[];
      renderer: THREE.WebGLRenderer;
      scene: THREE.Scene;
      light: THREE.PointLight;
      softLight: THREE.AmbientLight;
      modelGroup: THREE.Group;
      w: number = window.innerWidth;
      h: number = window.innerHeight;

      constructor(model: THREE.Group) {
        this.views = [
          { bottom: 0, height: 1 },
          { bottom: 0, height: 0 }
        ];

        this.renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: true,
          canvas: canvasRef.current!
        });

        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.setPixelRatio(window.devicePixelRatio);
        renderer = this.renderer; // Save reference for cleanup

        this.scene = new THREE.Scene();

        for (let ii = 0; ii < this.views.length; ++ii) {
          const view = this.views[ii];
          const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 2000);
          camera.position.fromArray([0, 0, 180]);
          camera.layers.disableAll();
          camera.layers.enable(ii);
          view.camera = camera;
          camera.lookAt(new THREE.Vector3(0, 5, 0));
        }

        this.light = new THREE.PointLight(0xffffff, 0.75, 0, 0); // added 0,0 for warnings in newer threejs
        this.light.position.set(70, -20, 150);
        this.scene.add(this.light);

        this.softLight = new THREE.AmbientLight(0xffffff, 1.5);
        this.scene.add(this.softLight);

        this.onResize();
        window.addEventListener('resize', this.onResize, false);

        const edges = new THREE.EdgesGeometry((model.children[0] as THREE.Mesh).geometry);
        const line = new THREE.LineSegments(edges);
        (line.material as THREE.LineBasicMaterial).depthTest = false;
        (line.material as THREE.LineBasicMaterial).opacity = 0.5;
        (line.material as THREE.LineBasicMaterial).transparent = true;
        line.position.set(0.5, 0.2, -1);

        this.modelGroup = new THREE.Group();
        model.layers.set(0);
        line.layers.set(1);

        this.modelGroup.add(model);
        this.modelGroup.add(line);
        this.scene.add(this.modelGroup);
      }

      render = () => {
        for (let ii = 0; ii < this.views.length; ++ii) {
          const view = this.views[ii];
          const camera = view.camera;

          const bottom = Math.floor(this.h * view.bottom);
          const height = Math.floor(this.h * view.height);

          this.renderer.setViewport(0, 0, this.w, this.h);
          this.renderer.setScissor(0, bottom, this.w, height);
          this.renderer.setScissorTest(true);

          camera.aspect = this.w / this.h;
          this.renderer.render(this.scene, camera);
        }
      };

      onResize = () => {
        this.w = window.innerWidth;
        this.h = window.innerHeight;

        for (let ii = 0; ii < this.views.length; ++ii) {
          const view = this.views[ii];
          const camera = view.camera;
          camera.aspect = this.w / this.h;
          const camZ = (window.screen.width - (this.w * 1)) / 3;
          camera.position.z = camZ < 180 ? 180 : camZ;
          camera.updateProjectionMatrix();
        }

        this.renderer.setSize(this.w, this.h);
        this.render();
      };
    }

    function setupAnimation(model: THREE.Group) {
      sceneObj = new Scene(model);
      const scene = sceneObj;
      const plane = scene.modelGroup;

      gsap.fromTo('canvas', { x: "50%", autoAlpha: 0 }, { duration: 1, x: "0%", autoAlpha: 1 });
      gsap.to('.loading', { autoAlpha: 0 });
      gsap.to('.scroll-cta', { opacity: 1 });
      gsap.set('svg', { autoAlpha: 1 });

      const tau = Math.PI * 2;

      gsap.set(plane.rotation, { y: tau * -.25 });
      gsap.set(plane.position, { x: 80, y: -32, z: -60 });

      scene.render();

      const sectionDuration = 1;

      gsap.to('.ground', {
        y: "30%",
        scrollTrigger: {
          trigger: ".ground-container",
          scrub: true,
          start: "top bottom",
          end: "bottom top"
        }
      });

      gsap.from('.clouds', {
        y: "25%",
        scrollTrigger: {
          trigger: ".ground-container",
          scrub: true,
          start: "top bottom",
          end: "bottom top"
        }
      });

      gsap.fromTo('.silhouette-back', 
        { opacity: 0, y: "20vh" },
        {
          opacity: 0.8,
          y: "0vh",
          scrollTrigger: {
            trigger: ".sunset",
            scrub: true,
            start: "top center",
            end: "bottom bottom"
          }
        }
      );

      gsap.fromTo('.silhouette-front', 
        { opacity: 0, y: "30vh" },
        {
          opacity: 1,
          y: "0vh",
          scrollTrigger: {
            trigger: ".sunset",
            scrub: true,
            start: "top center",
            end: "bottom bottom"
          }
        }
      );

      const tl = gsap.timeline({
        onUpdate: scene.render,
        scrollTrigger: {
          trigger: ".content",
          scrub: true,
          start: "top top",
          end: "bottom bottom"
        },
        defaults: { duration: sectionDuration, ease: 'power2.inOut' }
      });

      let delay = 0;

      // 1. Intro (Left text) -> Plane Right
      tl.to('.scroll-cta', { duration: 0.25, opacity: 0 }, delay);
      tl.to(plane.position, { x: 40, ease: 'power1.in' }, delay);

      delay += sectionDuration;
      // 2. "Destination" (Right text) -> Plane Left
      tl.to(plane.rotation, { x: tau * .25, y: 0, z: -tau * 0.05, ease: 'power1.inOut' }, delay);
      tl.to(plane.position, { x: -40, y: 0, z: -60, ease: 'power1.inOut' }, delay);

      delay += sectionDuration;
      // 3. "Complex" (Left text) -> Plane Right
      tl.to(plane.rotation, { x: tau * .25, y: 0, z: tau * 0.05, ease: 'power3.inOut' }, delay);
      tl.to(plane.position, { x: 40, y: 0, z: -60, ease: 'power2.inOut' }, delay);

      delay += sectionDuration;
      // 4. "Tabs" (Right text) -> Plane Left
      tl.to(plane.rotation, { x: tau * .2, y: 0, z: -tau * 0.1, ease: 'power3.inOut' }, delay);
      tl.to(plane.position, { x: -40, y: 0, z: -60, ease: 'power2.inOut' }, delay);

      delay += sectionDuration;
      // 5. "Logistics" (Left text) -> Plane Right
      tl.to(plane.rotation, { x: tau * .25, y: 0, z: tau * 0.05, ease: 'power3.inOut' }, delay);
      tl.to(plane.position, { x: 40, y: 0, z: -30, ease: 'power2.inOut' }, delay);

      delay += sectionDuration;
      // 6. "Defying" (Right text) -> Plane Left
      tl.to(plane.rotation, { x: 0, z: 0, y: tau * .25 }, delay);
      tl.to(plane.position, { x: -20, y: -10, z: 50 }, delay);

      delay += sectionDuration;
      // 7. Sunset empty -> Fly away
      tl.to(plane.rotation, { x: tau * 0.15, y: tau * .85, z: -tau * 0, ease: 'power1.in' }, delay);
      tl.to(plane.position, { z: -150, x: 0, y: 0, ease: 'power1.inOut' }, delay);

      delay += sectionDuration;
      // 8. Sunset end -> Rotate outwards
      tl.to(plane.rotation, { duration: sectionDuration * 3, x: -tau * 0.05, y: tau, z: -tau * 0.1, ease: 'power1.inOut' }, delay);
      tl.to(plane.position, { duration: sectionDuration * 3, x: 0, y: 0, z: 320, ease: 'power1.in' }, delay);
      
      tl.to(scene.light.position, { duration: sectionDuration * 3, x: 0, y: 0, z: 0 }, delay);
    }

    let object: THREE.Group;

    function addWindows(planeGroup: THREE.Group, planeMesh: THREE.Mesh) {
      const box = new THREE.Box3().setFromObject(planeMesh);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());

      const raycaster = new THREE.Raycaster();

      // Helper: raycast from side, return fuselage hit point
      function raycastSide(zPos: number, yPos: number, fromRight: boolean) {
        const origin = new THREE.Vector3(
          fromRight ? center.x + size.x * 2 : center.x - size.x * 2,
          yPos, zPos
        );
        const dir = new THREE.Vector3(fromRight ? -1 : 1, 0, 0);
        raycaster.set(origin, dir);
        const hits = raycaster.intersectObject(planeMesh, false)
          .filter(h => Math.abs(h.point.x - center.x) < size.x * 0.25);
        return hits.length > 0 ? hits[0] : null;
      }

      function placeMesh(geo: THREE.BufferGeometry, mat: THREE.Material, hit: any, group: THREE.Group) {
        const m = new THREE.Mesh(geo, mat);
        m.position.copy(hit.point);
        m.position.addScaledVector(hit.face!.normal, 0.08);
        // Use lookAt instead of quaternion to guarantee the Y-axis stays perfectly vertical
        m.lookAt(hit.point.clone().add(hit.face!.normal));
        group.add(m);
      }

      // --- Shared Materials ---
      const windowRadius = Math.max(size.x, size.z) * 0.0075;
      const windowMat = new THREE.MeshPhysicalMaterial({ color: 0x050505, roughness: 0.1, metalness: 0.9, clearcoat: 1.0 });

      // --- Doors (3 per side: front, mid, rear) ---
      const doorMat = new THREE.MeshPhysicalMaterial({ color: 0xf4f4f5, roughness: 0.3, metalness: 0.2, clearcoat: 1.0 }); 
      // Made doors taller (0.12 instead of 0.08) per user request
      const doorGeo = new THREE.BoxGeometry(size.z * 0.018, size.y * 0.12, 0.5);
      
      const doorEdges = new THREE.EdgesGeometry(doorGeo);
      const doorEdgeMat = new THREE.LineBasicMaterial({ color: 0x999999, opacity: 0.8, transparent: true });

      const doorWindowGeo = new THREE.CylinderGeometry(windowRadius * 0.5, windowRadius * 0.5, 0.6, 16);
      doorWindowGeo.rotateX(Math.PI / 2);

      // Slightly lower the door center since it's taller now
      const doorY = box.min.y + size.y * 0.36;
      const doorZPositions = [
        box.max.z - size.z * 0.16, // Front door
        center.z + size.z * 0.03,  // Mid door
        box.min.z + size.z * 0.28  // Rear door
      ];

      doorZPositions.forEach(dz => {
        [true, false].forEach(fromRight => {
          const hit = raycastSide(dz, doorY, fromRight);
          if (hit) {
            const d = new THREE.Mesh(doorGeo, doorMat);
            d.position.copy(hit.point);
            d.position.addScaledVector(hit.face!.normal, 0.08);
            // Use lookAt to lock the door perfectly vertically
            d.lookAt(hit.point.clone().add(hit.face!.normal));

            const outline = new THREE.LineSegments(doorEdges, doorEdgeMat);
            d.add(outline); 

            const dw = new THREE.Mesh(doorWindowGeo, windowMat);
            // Shifted up slightly more because the door is taller
            dw.position.set(0, size.y * 0.035, 0); 
            d.add(dw);

            planeGroup.add(d);
          }
        });
      });

      // --- Passenger Windows ---
      // Use a cylinder (coin) instead of a flat circle to give it thickness to prevent Z-fighting
      const windowGeo = new THREE.CylinderGeometry(windowRadius, windowRadius, 0.5, 16);
      windowGeo.rotateX(Math.PI / 2); // Orient so the flat circular face points along Z
      const numWindows = 28;
      const startZ = box.min.z + size.z * 0.24;
      const endZ = box.max.z - size.z * 0.14;
      const winY = box.min.y + size.y * 0.35;

      for (let i = 0; i < numWindows; i++) {
        const z = startZ + (endZ - startZ) * (i / (numWindows - 1));
        
        // Skip passenger window if it overlaps with a door
        let overlap = false;
        doorZPositions.forEach(dz => {
           if (Math.abs(z - dz) < size.z * 0.025) {
               overlap = true;
           }
        });
        if (overlap) continue;

        [true, false].forEach(fromRight => {
          const hit = raycastSide(z, winY, fromRight);
          if (hit) placeMesh(windowGeo, windowMat, hit, planeGroup);
        });
      }

      // --- Cockpit Visor (2 dark angled windows near nose) ---
      const cockpitMat = new THREE.MeshPhysicalMaterial({ color: 0x0a0a12, roughness: 0.05, metalness: 1.0, clearcoat: 1.0 });
      const cockpitGeo = new THREE.BoxGeometry(size.x * 0.06, size.y * 0.055, 0.5);
      const cockpitY = box.min.y + size.y * 0.385;
      const cockpitZ = box.max.z - size.z * 0.065;
      [true, false].forEach(fromRight => {
        const hit = raycastSide(cockpitZ, cockpitY, fromRight);
        if (hit) placeMesh(cockpitGeo, cockpitMat, hit, planeGroup);
      });
    }

    function onModelLoaded() {
      let planeMesh: THREE.Mesh | null = null;
      object.traverse(function (child) {
        if ((child as THREE.Mesh).isMesh) {
          planeMesh = child as THREE.Mesh;

          // --- Retract Landing Gear ---
          const box = new THREE.Box3().setFromObject(planeMesh);
          const size = box.getSize(new THREE.Vector3());
          const center = box.getCenter(new THREE.Vector3());
          const pos = planeMesh.geometry.attributes.position;
          
          const gearThreshold = box.min.y + size.y * 0.12; 
          
          const colors = [];
          
          for (let i = 0; i < pos.count; i++) {
            let x = pos.getX(i);
            let y = pos.getY(i);
            let z = pos.getZ(i);
            
            // Retract wheels
            if (y < gearThreshold) {
              pos.setY(i, gearThreshold);
              y = gearThreshold;
            }

            let r = 1, g = 1, b = 1;
            
            const distFromCenterX = Math.abs(x - center.x);
            const relZ = (z - box.min.z) / size.z;
            const relY = (y - box.min.y) / size.y;

            // 1. Paint Engines Gray — strict ellipsoid + hard Y cap so wings stay white
            const eDx = distFromCenterX - size.x * 0.26;
            const eDy = y - (box.min.y + size.y * 0.18);
            const eDz = z - (center.z + size.z * 0.08);

            const eRx = size.x * 0.10;
            const eRy = size.y * 0.10;
            const eRz = size.z * 0.16;

            // Hard Y cap: ONLY vertices strictly in the bottom 28% of the model
            if (
              y < box.min.y + size.y * 0.28 &&
              (eDx*eDx)/(eRx*eRx) + (eDy*eDy)/(eRy*eRy) + (eDz*eDz)/(eRz*eRz) < 1.0
            ) {
               r = 0.32; g = 0.32; b = 0.36;
            }

            // 2. Tail Fin Livery — tight to vertical stabilizer only (thin slab)
            // Vertical stabilizer is the thin geometry at the very back, centered on X=0
            if (
              distFromCenterX < size.x * 0.04 && // Only the thin fin, not fuselage
              relZ < 0.18 &&                     // Rear 18% of the plane
              relY > 0.52                        // Upper half
            ) {
               r = 0.88; g = 0.12; b = 0.18;   // Bold red
            }

            colors.push(r, g, b);
          }
          planeMesh.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
          planeMesh.geometry.attributes.position.needsUpdate = true;

          // Generate smooth vertex normals so it doesn't look faceted
          planeMesh.geometry.computeVertexNormals();
          
          // Realistic glossy white plane paint
          const mat = new THREE.MeshPhysicalMaterial({ 
            color: 0xf4f4f5, 
            metalness: 0.2, 
            roughness: 0.3,
            clearcoat: 1.0,
            clearcoatRoughness: 0.1,
            flatShading: false,
            vertexColors: true // Enable vertex coloring for the engines
          });
          planeMesh.material = mat;
        }
      });

      if (planeMesh) {
        try {
          addWindows(object, planeMesh);
        } catch (e) { console.error("Failed to add windows", e); }
      }

      setupAnimation(object);
    }

    const manager = new THREE.LoadingManager(onModelLoaded);
    manager.onProgress = (item, loaded, total) => console.log(item, loaded, total);

    const loader = new OBJLoader(manager);
    loader.load('https://assets.codepen.io/557388/1405+Plane_1.obj', function (obj) { object = obj; });

    // Cleanup
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      ScrollTrigger.getAll().forEach(t => t.kill());
      if (sceneObj) {
        window.removeEventListener('resize', sceneObj.onResize);
      }
      if (renderer) {
        renderer.dispose();
      }
    };
  }, []);

  return (
    <div className="landing-body bg-[#dfddd5] text-[#151515]" ref={containerRef} style={{ backgroundColor: '#D0CBC7' }}>
      {/* Epic Games Style Navbar */}
      <nav className="absolute top-0 left-0 w-full z-[100] flex items-center justify-between px-4 py-3 bg-[#151515] text-[#E2E2E2] font-sans border-b border-black/50 shadow-md">
        
        {/* Left: Logos and Links */}
        <div className="flex items-center gap-6">
          {/* Faux "Epic" Logo area */}
          <div className="flex items-center gap-3 border-r border-white/10 pr-4 cursor-pointer hover:opacity-80 transition-opacity">
            <div className="w-8 h-9 bg-white text-black flex items-center justify-center font-black text-[10px] leading-tight text-center rounded-sm">
              TRIP<br/>AL
            </div>
            <ChevronDown size={14} className="text-white/50" />
          </div>

          {/* Main Logo */}
          <div className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
            <div className="w-7 h-7 rounded-full border-[2.5px] border-current flex items-center justify-center">
              <span className="font-bold text-sm leading-none mt-0.5">g</span>
            </div>
            <span className="font-extrabold text-lg tracking-tight text-white mt-0.5">TRIPAL ENGINE</span>
          </div>

          {/* Links */}
          <div className="hidden lg:flex items-center gap-8 ml-6">
            <button 
              onClick={() => router.push('/recommend')} 
              className="text-[13px] tracking-wide font-medium opacity-80 hover:opacity-100 hover:text-white transition-all"
            >
              Recommend Trips
            </button>
            <button 
              onClick={() => router.push('/plan/setup')} 
              className="text-[13px] tracking-wide font-medium opacity-80 hover:opacity-100 hover:text-white transition-all"
            >
              Plan a Trip
            </button>
          </div>
        </div>

        {/* Right Action */}
        <div className="flex items-center gap-4">
          {/* Search Bar */}
          <div className="hidden xl:flex items-center bg-[#202020] rounded-full px-4 py-1.5 border border-transparent hover:bg-[#2A2A2E] transition-colors w-56">
            <Search size={16} className="text-white/50 mr-2" />
            <input 
              type="text" 
              placeholder="Search" 
              className="bg-transparent border-none outline-none text-[13px] text-white placeholder-white/50 w-full font-medium"
            />
          </div>

          <button className="hover:text-white transition-colors p-1 hidden sm:block">
            <Globe size={20} className="text-white/70" />
          </button>
          
          <button className="px-4 py-2 rounded bg-[#2A2A2E] hover:bg-[#3A3A3E] text-white text-[13px] font-bold transition-colors">
            Sign in
          </button>

          <button className="px-4 py-2 rounded bg-[#007BED] hover:bg-[#3395F0] text-black text-[13px] font-bold transition-colors">
            Download
          </button>
        </div>
      </nav>

      <canvas ref={canvasRef} />
      
      <div className="content">
        <div className="loading">Loading Engine...</div>
        <div className="trigger"></div>
        <div className="ground-container">
          <div className="parallax ground" style={{ backgroundImage: 'url("https://assets.codepen.io/557388/background-reduced.jpg"), linear-gradient(to bottom, #b4afaa, #D0CBC7)', zIndex: 0 }}></div>
          
          <div className="section relative z-50">
            <h1 className="!text-black" style={{ color: '#000000' }}>Ghumi-Ghumi.</h1>
            <h3 className="!text-black" style={{ color: '#000000' }}>The beginner's guide to planning.</h3>
            <p className="!text-black" style={{ color: '#000000' }}>You've probably forgotten how easy it can be.</p>
            <div className="scroll-cta !text-black" style={{ color: '#000000' }}>Scroll down</div>
          </div>
          
          <div className="section right relative z-50">
            <div className="inline-block max-w-2xl backdrop-blur-xl bg-white/40 p-8 md:p-12 rounded-3xl border border-white/50 shadow-xl">
              <h2 className="!text-black" style={{ color: '#000000' }}>It starts with a destination...</h2>
            </div>
          </div>

          <div className="section relative z-50">
            <div className="inline-block max-w-2xl backdrop-blur-xl bg-white/40 p-8 md:p-12 rounded-3xl border border-white/50 shadow-xl text-left">
              <h2 className="!text-black" style={{ color: '#000000' }}>..but quickly becomes complex.</h2>
              <p className="text-xl md:text-2xl inline-block w-fit bg-gradient-to-r from-[#5a5bc8] to-[#c272a9] bg-clip-text text-transparent font-bold mt-2">Hotels, budgets, schedules!?</p>
            </div>
          </div>

          <div className="section right relative z-50">
            <div className="inline-block max-w-2xl backdrop-blur-xl bg-white/40 p-8 md:p-12 rounded-3xl border border-white/50 shadow-xl">
              <h2 className="!text-black" style={{ color: '#000000' }}>And a million open tabs.</h2>
              <p className="text-xl md:text-2xl inline-block w-fit bg-gradient-to-r from-[#5a5bc8] to-[#c272a9] bg-clip-text text-transparent font-bold mt-2">Flights, trains, hotels everywhere.</p>
            </div>
          </div>

          <div className="section relative z-50">
            <div className="inline-block max-w-2xl backdrop-blur-xl bg-white/40 p-8 md:p-12 rounded-3xl border border-white/50 shadow-xl text-left">
              <h2 className="!text-black" style={{ color: '#000000' }}>We handle the logistics.</h2>
              <p className="text-xl md:text-2xl inline-block w-fit bg-gradient-to-r from-[#5a5bc8] to-[#c272a9] bg-clip-text text-transparent font-bold mt-2">For realsies!</p>
            </div>
          </div>
          
          <div className="section right relative z-50">
            <div className="inline-block max-w-2xl backdrop-blur-xl bg-white/40 p-8 md:p-12 rounded-3xl border border-white/50 shadow-xl">
              <h2 className="!text-black" style={{ color: '#000000' }}>Defying all known planning stress.</h2>
              <p className="text-xl md:text-2xl inline-block w-fit bg-gradient-to-r from-[#5a5bc8] to-[#c272a9] bg-clip-text text-transparent font-bold mt-2">It's actual magic!</p>
            </div>
          </div>
          <div className="parallax clouds"></div>
        </div>
        


        <div className="sunset">
          <div className="silhouette-back"></div>
          <div className="silhouette-front"></div>
          <div className="section"></div>
          {/* Padding sections to perfectly map the 3x duration final animation */}
          <div className="section"></div>
          <div className="section"></div>
          <div className="section end flex flex-col items-center justify-center pt-32 text-white">
            <h2 className="mb-12">Let's go.</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl mx-auto px-6 relative z-10">
              {/* Card 1: Recommend Mode */}
              <div 
                onClick={() => router.push('/recommend')}
                className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-3xl cursor-pointer hover:bg-white/20 transition-all hover:scale-105 group flex flex-col justify-between"
              >
                <div>
                  <div className="bg-white/20 w-12 h-12 rounded-xl flex items-center justify-center mb-5">
                    <Sparkles className="text-white" size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Recommend a Trip</h3>
                  <p className="text-zinc-300 text-base mb-6 leading-relaxed">
                    "We are 4 friends with ₹25k each. Recommend places for us."
                  </p>
                </div>
                <div className="flex items-center text-white font-bold group-hover:translate-x-2 transition-transform">
                  Discovery Engine <ArrowRight className="ml-2 w-5 h-5" />
                </div>
              </div>

              {/* Card 2: Direct Planning Mode */}
              <div 
                onClick={() => router.push('/plan/setup')}
                className="bg-blue-600 border border-blue-500 p-6 rounded-3xl cursor-pointer hover:bg-blue-500 transition-all duration-300 hover:scale-105 group shadow-[0_0_40px_-10px_rgba(37,99,235,0.5)] hover:shadow-[0_0_60px_-15px_rgba(37,99,235,0.7)] flex flex-col justify-between"
              >
                <div>
                  <div className="bg-white/20 w-12 h-12 rounded-xl flex items-center justify-center mb-5">
                    <Map className="text-primary w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Plan My Trip</h3>
                  <p className="text-blue-100 text-base mb-6 leading-relaxed">
                    "I already know I'm going to Manali. Plan the logistics for me."
                  </p>
                </div>
                <div className="flex items-center text-white font-bold group-hover:translate-x-2 transition-transform">
                  Start Planning Now <ArrowRight className="ml-2 w-5 h-5" />
                </div>
              </div>
            </div>

            <ul className="credits mt-32 text-center text-zinc-400 text-xs">
              <li>Plane model by <a href="https://poly.google.com/view/8ciDd9k8wha" target="_blank" rel="noreferrer" className="underline">Google</a></li>
              <li>Animated using <a href="https://greensock.com/scrolltrigger/" target="_blank" rel="noreferrer" className="underline">GSAP ScrollTrigger</a></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
