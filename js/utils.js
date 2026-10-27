// js/utils.js
// 共通ユーティリティ

/**
 * 3Dオブジェクトをシーンから外し、GPUメモリ（形状・素材・画像）も解放する。
 * scene.remove() だけでは画面から消えるだけで、メモリは解放されない。
 */
export function disposeObject(obj) {
    if(!obj) return;

    if(obj.parent) {
        obj.parent.remove(obj);
    }

    obj.traverse((node) => {
        if(node.geometry) {
            node.geometry.dispose();
        }
        if(node.material) {
            const materials = Array.isArray(node.material) ? node.material : [node.material];
            materials.forEach((mat) => {
                // 素材に付いている画像（テクスチャ）をすべて解放
                Object.keys(mat).forEach((key) => {
                    const value = mat[key];
                    if(value && value.isTexture) {
                        value.dispose();
                    }
                });
                mat.dispose();
            });
        }
    });
}
