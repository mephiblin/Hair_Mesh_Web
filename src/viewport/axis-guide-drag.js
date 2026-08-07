export function axisVector(THREE, axis) {
  if (axis === 'X') return new THREE.Vector3(1, 0, 0);
  if (axis === 'Y') return new THREE.Vector3(0, 1, 0);
  return new THREE.Vector3(0, 0, 1);
}

export function createAxisDragPlane(THREE, camera, axisWorld, origin) {
  const normal = new THREE.Vector3();
  camera.getWorldDirection(normal);
  normal.addScaledVector(axisWorld, -normal.dot(axisWorld));

  if (normal.lengthSq() < 1e-8) {
    normal.copy(camera.up).applyQuaternion(camera.quaternion);
    normal.addScaledVector(axisWorld, -normal.dot(axisWorld));
  }
  if (normal.lengthSq() < 1e-8) {
    normal.copy(Math.abs(axisWorld.x) < .9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0));
    normal.addScaledVector(axisWorld, -normal.dot(axisWorld));
  }
  return new THREE.Plane().setFromNormalAndCoplanarPoint(normal.normalize(), origin);
}

export function axisDragScalar(point, origin, axisWorld) {
  return point.clone().sub(origin).dot(axisWorld);
}
