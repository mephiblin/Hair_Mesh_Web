const DEFAULT_EPSILON = 1e-10;

function isFiniteVector(vector) {
  return vector
    && Number.isFinite(vector.x)
    && Number.isFinite(vector.y)
    && Number.isFinite(vector.z);
}

function leastParallelAxis(THREE, tangent) {
  const ax = Math.abs(tangent.x);
  const ay = Math.abs(tangent.y);
  const az = Math.abs(tangent.z);
  let minimum = Number.POSITIVE_INFINITY;
  const axis = new THREE.Vector3();
  if (ax <= minimum) { minimum = ax; axis.set(1, 0, 0); }
  if (ay <= minimum) { minimum = ay; axis.set(0, 1, 0); }
  if (az <= minimum) axis.set(0, 0, 1);
  return axis;
}

function orthogonalNormal(THREE, tangent, preferred = null, epsilon = DEFAULT_EPSILON) {
  const normal = preferred && isFiniteVector(preferred)
    ? preferred.clone()
    : leastParallelAxis(THREE, tangent);
  normal.addScaledVector(tangent, -normal.dot(tangent));
  if (!isFiniteVector(normal) || normal.lengthSq() <= epsilon * epsilon) {
    normal.copy(leastParallelAxis(THREE, tangent));
    normal.addScaledVector(tangent, -normal.dot(tangent));
  }
  return normal.normalize();
}

function initialNormal(THREE, tangent, preferred, epsilon) {
  if (preferred && isFiniteVector(preferred)) {
    return orthogonalNormal(THREE, tangent, preferred, epsilon);
  }
  /* Match Three.js Curve.computeFrenetFrames orientation for existing assets. */
  const helper = new THREE.Vector3().crossVectors(tangent, leastParallelAxis(THREE, tangent));
  if (helper.lengthSq() <= epsilon * epsilon) {
    return orthogonalNormal(THREE, tangent, null, epsilon);
  }
  return new THREE.Vector3().crossVectors(tangent, helper.normalize()).normalize();
}

function arcToRaw(path, arcParameter) {
  const fallback = Math.min(1, Math.max(0, arcParameter));
  try {
    const mapped = path.getUtoTmapping(fallback);
    return Number.isFinite(mapped) ? mapped : fallback;
  } catch {
    return fallback;
  }
}

function tangentAt(THREE, path, arcParameter) {
  return path.getTangent(arcToRaw(path, arcParameter), new THREE.Vector3());
}

function pointAt(THREE, path, arcParameter) {
  return path.getPoint(arcToRaw(path, arcParameter), new THREE.Vector3());
}

function safeTangent(THREE, path, index, segments, previous, epsilon) {
  const t = index / segments;
  const tangent = tangentAt(THREE, path, t);
  if (isFiniteVector(tangent) && tangent.lengthSq() > epsilon * epsilon) return tangent.normalize();

  const step = 1 / segments;
  const before = pointAt(THREE, path, Math.max(0, t - step));
  const after = pointAt(THREE, path, Math.min(1, t + step));
  tangent.copy(after).sub(before);
  if (isFiniteVector(tangent) && tangent.lengthSq() > epsilon * epsilon) return tangent.normalize();
  if (previous && isFiniteVector(previous) && previous.lengthSq() > epsilon * epsilon) return tangent.copy(previous);
  return tangent.set(0, 1, 0);
}

function frameQuaternion(THREE, normal, tangent, binormal) {
  return new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(normal, tangent, binormal)
  ).normalize();
}

function keepQuaternionHemisphere(previous, current) {
  if (previous && previous.dot(current) < 0) {
    current.set(-current.x, -current.y, -current.z, -current.w);
  }
  return current;
}

function signedAngleAroundAxis(THREE, from, to, axis) {
  const cross = new THREE.Vector3().crossVectors(from, to);
  return Math.atan2(axis.dot(cross), THREE.MathUtils.clamp(from.dot(to), -1, 1));
}

function closeFrameRoll(THREE, tangents, normals, binormals, epsilon) {
  const last = normals.length - 1;
  if (last < 1) return;
  const axis = tangents[0].clone().add(tangents[last]);
  if (axis.lengthSq() <= epsilon * epsilon) axis.copy(tangents[0]);
  axis.normalize();
  const rollError = signedAngleAroundAxis(THREE, normals[last], normals[0], axis);

  for (let index = 1; index <= last; index += 1) {
    const correction = new THREE.Quaternion().setFromAxisAngle(tangents[index], rollError * index / last);
    normals[index].applyQuaternion(correction);
    normals[index].addScaledVector(tangents[index], -normals[index].dot(tangents[index])).normalize();
    binormals[index].crossVectors(normals[index], tangents[index]).normalize();
    normals[index].crossVectors(tangents[index], binormals[index]).normalize();
  }
}

/**
 * Build stable sweep frames. Twist correction uses parallel transport
 * (rotation-minimizing frames); disabling it uses independent fixed-up frames.
 */
export function buildSweepFrames(THREE, path, requestedSegments, options = {}) {
  const segments = Math.max(1, Math.trunc(requestedSegments) || 1);
  const epsilon = Math.max(options.epsilon ?? DEFAULT_EPSILON, Number.EPSILON);
  const twistCorrection = options.twistCorrection !== false;
  const closed = options.closed === true;
  const tangents = [];
  const normals = [];
  const binormals = [];
  const quaternions = [];
  let fallbackTangents = 0;
  let oppositeTurns = 0;

  for (let index = 0; index <= segments; index += 1) {
    const raw = tangentAt(THREE, path, index / segments);
    const rawValid = isFiniteVector(raw) && raw.lengthSq() > epsilon * epsilon;
    const tangent = rawValid
      ? raw.normalize()
      : safeTangent(THREE, path, index, segments, tangents[index - 1], epsilon);
    if (!rawValid) fallbackTangents += 1;
    tangents.push(tangent);

    let normal;
    if (index === 0 || !twistCorrection) {
      normal = initialNormal(THREE, tangent, options.initialNormal, epsilon);
    } else {
      const previousTangent = tangents[index - 1];
      const previousNormal = normals[index - 1];
      const axis = new THREE.Vector3().crossVectors(previousTangent, tangent);
      const axisLength = axis.length();
      const dot = THREE.MathUtils.clamp(previousTangent.dot(tangent), -1, 1);
      normal = previousNormal.clone();

      if (axisLength > epsilon) {
        const rotation = new THREE.Quaternion().setFromAxisAngle(
          axis.multiplyScalar(1 / axisLength),
          Math.atan2(axisLength, dot)
        );
        normal.applyQuaternion(rotation);
      } else if (dot < 0) {
        oppositeTurns += 1;
        const turnAxis = binormals[index - 1]?.clone()
          || orthogonalNormal(THREE, previousTangent, null, epsilon);
        normal.applyAxisAngle(turnAxis.normalize(), Math.PI);
      }
      normal = orthogonalNormal(THREE, tangent, normal, epsilon);
    }

    const binormal = new THREE.Vector3().crossVectors(normal, tangent);
    if (!isFiniteVector(binormal) || binormal.lengthSq() <= epsilon * epsilon) {
      normal = orthogonalNormal(THREE, tangent, null, epsilon);
      binormal.crossVectors(normal, tangent);
    }
    binormal.normalize();
    normal.crossVectors(tangent, binormal).normalize();
    normals.push(normal);
    binormals.push(binormal);
  }

  if (closed && twistCorrection) closeFrameRoll(THREE, tangents, normals, binormals, epsilon);

  for (let index = 0; index <= segments; index += 1) {
    quaternions.push(keepQuaternionHemisphere(
      quaternions[index - 1],
      frameQuaternion(THREE, normals[index], tangents[index], binormals[index])
    ));
  }

  return {
    tangents,
    normals,
    binormals,
    quaternions,
    diagnostics: { fallbackTangents, oppositeTurns }
  };
}
