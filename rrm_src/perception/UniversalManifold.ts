import { TensorVector, GLOBAL_DIMENSION } from '../core/config';
import { FHRR } from '../core/fhrr';

/**
 * 👁️ UNIVERSAL MANIFOLD (Fase 2: The Perception Layer)
 * Bertugas mencerna segala bentuk input (1D String, 2D Grid ARC) dan
 * mengubahnya menjadi aliran sinyal Tensor (Holographic Stream)
 * yang 100% agnostik. Mesin tidak tahu apakah yang dilihatnya gambar atau kata.
 */
export class UniversalManifold {
    // Sumbu Spasial Dasar untuk VSA
    private X_AXIS_SEED: TensorVector;
    private Y_AXIS_SEED: TensorVector;
    private COLOR_SEED: TensorVector; // Alias "Token Seed"

    constructor() {
        // Membuat seed ortogonal dasar (Holographic Axioms)
        this.X_AXIS_SEED = FHRR.create();
        this.Y_AXIS_SEED = FHRR.create();
        this.COLOR_SEED  = FHRR.create();
    }

    /**
     * fractionalBind: Memutar fasa vektor sebanyak `power`.
     * Digunakan untuk merepresentasikan posisi koordinat secara berkesinambungan (continuous).
     * Jika X = 2, vektornya diputar 2x lipat lebih jauh dibanding X = 1.
     */
    private encodeCoordinate(axisSeed: TensorVector, value: number): TensorVector {
        // value sebaiknya dinormalisasi, tetapi untuk koordinat ARC kita asumsikan
        // ia ditranslasikan secara linear lewat FHRR fractionalBind
        return FHRR.fractionalBind(axisSeed, value);
    }

    /**
     * Memproses data Agnostik.
     * Jika array 1D (seperti token NLP/Teks): Kita asumsikan Y = 0 konstan.
     * Jika array 2D (seperti ARC): Kita mapping X dan Y nya.
     * @returns Kumpulan sinyal spasial (Pixel/Token) yang masing-masing berupa TensorVector.
     */
    public encodeAgnosticInput(input: number[] | number[][]): Map<string, TensorVector> {
        const stream = new Map<string, TensorVector>();

        // Deteksi jenis dimensi dengan mengecek elemen pertama (Tanpa if-else yang kaku untuk logic,
        // hanya validasi tipe data TS)
        const is2D = Array.isArray(input[0]);

        if (is2D) {
            // PROSES GRID 2D (ARC)
            const grid = input as number[][];
            const height = grid.length;
            const width = grid[0]?.length || 0;

            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const token = grid[y]![x]!;
                    if (token === 0) continue; // Abaikan background

                    // Posisi relatif agar agnostik terhadap ukuran kanvas
                    const relX = x / Math.max(1, width - 1);
                    const relY = y / Math.max(1, height - 1);

                    const encodedPixel = this.buildPixelTensor(relX, relY, token);
                    stream.set(`${x},${y}_t${token}`, encodedPixel);
                }
            }
        } else {
            // PROSES STREAM 1D (TEKS / TOKEN)
            const sequence = input as number[];
            const length = sequence.length;

            for (let x = 0; x < length; x++) {
                const token = sequence[x]!;
                const relX = x / Math.max(1, length - 1);

                // Y selalu 0 untuk deret teks
                const encodedToken = this.buildPixelTensor(relX, 0, token);
                stream.set(`${x},0_t${token}`, encodedToken);
            }
        }

        return stream;
    }

    /**
     * Merakit satu "Partikel Kesadaran" (Pixel/Token) menjadi Superposisi Kuantum.
     * Tensor = Bind( X^relX, Bind(Y^relY, COLOR^token) )
     */
    private buildPixelTensor(relX: number, relY: number, token: number): TensorVector {
        const xTensor = this.encodeCoordinate(this.X_AXIS_SEED, relX);
        const yTensor = this.encodeCoordinate(this.Y_AXIS_SEED, relY);
        const colorTensor = this.encodeCoordinate(this.COLOR_SEED, token);

        // Ikat semua properti menjadi satu Vektor Kesatuan
        const xyBind = FHRR.bind(xTensor, yTensor);
        return FHRR.bind(xyBind, colorTensor);
    }
}