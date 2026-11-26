"""Analytic inverse kinematics of the UR3e (nominal DH), verified against fk() on 200 random poses."""
import numpy as np
d1,a2,a3,d4,d5,d6=0.15185,-0.24355,-0.2132,0.13105,0.08535,0.0921
def ik_all(T):
    """Analytic UR IK (base->flange 4x4) -> list of up to 8 joint vectors."""
    sols=[]
    p05=T@np.array([0,0,-d6,1])
    R=np.hypot(p05[0],p05[1])
    if R<abs(d4): return sols
    phi1=np.arctan2(p05[1],p05[0]); phi2=np.arccos(np.clip(d4/R,-1,1))
    for q1 in (phi1+phi2+np.pi/2, phi1-phi2+np.pi/2):
        c=(T[0,3]*np.sin(q1)-T[1,3]*np.cos(q1)-d4)/d6
        if abs(c)>1: continue
        for s5 in (1,-1):
            q5=s5*np.arccos(np.clip(c,-1,1))
            s=np.sin(q5)
            if abs(s)<1e-6: continue
            # q6
            x=(-T[0,1]*np.sin(q1)+T[1,1]*np.cos(q1))/s
            y=( T[0,0]*np.sin(q1)-T[1,0]*np.cos(q1))/s
            q6=np.arctan2(x,y)
            # transform to frame 1 and 4 to solve planar 2R
            def A(i,q):
                d=[d1,0,0,d4,d5,d6]; a=[0,a2,a3,0,0,0]; al=[np.pi/2,0,0,np.pi/2,-np.pi/2,0]
                ct,st,ca,sa=np.cos(q),np.sin(q),np.cos(al[i]),np.sin(al[i])
                return np.array([[ct,-st*ca,st*sa,a[i]*ct],[st,ct*ca,-ct*sa,a[i]*st],[0,sa,ca,d[i]],[0,0,0,1]])
            T14=np.linalg.inv(A(0,q1))@T@np.linalg.inv(A(5,q6))@np.linalg.inv(A(4,q5))
            p13=T14@np.array([0,-d4,0,1])
            px,py=p13[0],p13[1]
            c3=(px*px+py*py-a2*a2-a3*a3)/(2*a2*a3)
            if abs(c3)>1: continue
            for s3 in (1,-1):
                q3=s3*np.arccos(c3)
                q2=np.arctan2(py,px)-np.arctan2(a3*np.sin(q3),a2+a3*np.cos(q3))
                T34=np.linalg.inv(A(1,q2)@A(2,q3))@T14
                q4=np.arctan2(T34[1,0],T34[0,0])
                sols.append(np.array([q1,q2,q3,q4,q5,q6]))
    return sols
def closest(sols,qref,limit=np.radians(355)):
    best=None
    for s in sols:
        s=s.copy()
        for j in range(6):   # choose the 2pi-equivalent closest to qref, within limits
            c=s[j]+2*np.pi*np.round((qref[j]-s[j])/(2*np.pi))
            if abs(c)>limit: c-=2*np.pi*np.sign(c)
            s[j]=c
        if np.any(np.abs(s)>limit): continue
        dist=np.max(np.abs(s-qref))
        if best is None or dist<best[0]: best=(dist,s)
    return None if best is None else best[1]


def fk(q):
    """Nominal UR3e forward kinematics, base -> flange (4x4)."""
    d = [d1, 0, 0, d4, d5, d6]; a = [0, a2, a3, 0, 0, 0]; al = [np.pi/2, 0, 0, np.pi/2, -np.pi/2, 0]
    T = np.eye(4)
    for i in range(6):
        ct, st, ca, sa = np.cos(q[i]), np.sin(q[i]), np.cos(al[i]), np.sin(al[i])
        T = T @ np.array([[ct, -st*ca, st*sa, a[i]*ct], [st, ct*ca, -ct*sa, a[i]*st], [0, sa, ca, d[i]], [0, 0, 0, 1]])
    return T


# ---------------------------------------------------------------------------------------------
# Rough self-collision / table check with capsules (added 27/11 after the 26/11 collision:
# the OnRobot gripper + camera folded back onto the shoulder). Sizes are deliberately LARGE.
def _frames(q):
    d = [d1, 0, 0, d4, d5, d6]; a = [0, a2, a3, 0, 0, 0]; al = [np.pi/2, 0, 0, np.pi/2, -np.pi/2, 0]
    T = np.eye(4); out = [T.copy()]
    for i in range(6):
        ct, st, ca, sa = np.cos(q[i]), np.sin(q[i]), np.cos(al[i]), np.sin(al[i])
        T = T @ np.array([[ct, -st*ca, st*sa, a[i]*ct], [st, ct*ca, -ct*sa, a[i]*st], [0, sa, ca, d[i]], [0, 0, 0, 1]])
        out.append(T.copy())
    return out


def _seg_dist(p1, q1, p2, q2):
    """Minimum distance between segments [p1,q1] and [p2,q2] (sampled, robust and simple)."""
    t = np.linspace(0, 1, 15)
    A = p1[None] + t[:, None] * (q1 - p1)[None]
    B = p2[None] + t[:, None] * (q2 - p2)[None]
    return float(np.min(np.linalg.norm(A[:, None] - B[None], axis=2)))


TOOL_LENGTH = 0.22   # flange -> finger tips (OnRobot gripper + margin), along flange z
# Thresholds calibrated on the 26/11 run (distances from the nominal DH model):
#   safe poses kept the tool segment >= 0.196 m from the base axis, the collision pose went to 0.148 m;
#   one pose brought the finger tips 4 cm above the table (camera cable pulled there).
MIN_DIST_BASE = 0.20       # tool segment <-> base/shoulder vertical axis
MIN_DIST_UPPER_ARM = 0.15  # tool segment <-> upper-arm segment
MIN_TIP_ABOVE_TABLE = 0.08 # finger tips / flange above the table plane


def collision(q, table_z=-0.03):
    """True if the tool (gripper+camera) gets too close to the base/shoulder/upper arm or the table."""
    F = _frames(q)
    flange = F[6][:3, 3]
    tip = flange + F[6][:3, 2] * TOOL_LENGTH
    if _seg_dist(flange, tip, np.array([0, 0, 0.0]), np.array([0, 0, d1 + 0.08])) < MIN_DIST_BASE:
        return "tool vs base/shoulder"
    if _seg_dist(flange, tip, F[1][:3, 3], F[2][:3, 3]) < MIN_DIST_UPPER_ARM:
        return "tool vs upper arm"
    if min(tip[2], flange[2]) < table_z + MIN_TIP_ABOVE_TABLE:
        return "tool vs table"
    return None


def path_collision(q_from, q_to, table_z=-0.03, steps=25):
    """Check the straight joint-space path used by moveJ."""
    for s in np.linspace(0, 1, steps):
        c = collision(np.asarray(q_from) + s * (np.asarray(q_to) - np.asarray(q_from)), table_z)
        if c:
            return c
    return None
