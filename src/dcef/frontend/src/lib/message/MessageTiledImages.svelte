<script lang="ts">
    import type { Asset } from '../../js/interfaces';
    import Image from '../imagegallery/Image.svelte';

    interface MyProps {
        images: Asset[];
        isAttachment: boolean;
        onmediastatus?: (asset: Asset, status: "loaded" | "failed") => void;
        messageId?: string;
        mediaKind?: string;
    }
    let { images, isAttachment, onmediastatus = undefined, messageId = undefined, mediaKind = undefined}: MyProps = $props();

    function getAspectRatio(image: Asset): string | undefined {
        if (!image.width || !image.height) {
            return undefined;
        }

        return `${image.width} / ${image.height}`;
    }

    let groupedImageAttachments = $derived.by(() => {
		if (images.length == 0) {
			return [];
		}

		let rows = [];
		if (images.length == 1) {
			rows.push([images[0]]);
		}
		else if (images.length == 2) {
			rows.push([images[0], images[1]]);
		}
		else if (images.length == 3) {
			rows.push([images[0]]);
			rows.push([images[1], images[2]]);
		}
		else if (images.length == 4) {
			rows.push([images[0], images[1]]);
			rows.push([images[2], images[3]]);
		}
		else if (images.length == 5) {
			rows.push([images[0], images[1]]);
			rows.push([images[2], images[3], images[4]]);
		}
		else if (images.length % 3 == 0) {
			for (let i = 0; i < images.length; i += 3) {
				rows.push([images[i], images[i + 1], images[i + 2]]);
			}
		}
		else if (images.length % 3 == 1) {
			rows.push([images[0]]);
			for (let i = 1; i < images.length; i += 3) {
				rows.push([images[i], images[i + 1], images[i + 2]]);
			}
		}
		else if (images.length % 3 == 2) {
			rows.push([images[0], images[1]]);
			for (let i = 2; i < images.length; i += 3) {
				rows.push([images[i], images[i + 1], images[i + 2]]);
			}
		}
		return rows;
	});
</script>

<div class="images" class:images3={images.length == 3} class:inline={images.length == 1 && isAttachment}>
    {#each groupedImageAttachments as imageGroup}
        <div class="image-row" >
            {#each imageGroup as image}
                <Image
                    assets={images}
                    asset={image}
                    aspectRatio={getAspectRatio(image)}
                    reserveSpace={true}
                    fillContainer={imageGroup.length > 1 || images.length == 3}
                    showCloudIndicator={true}
                    {messageId}
                    {mediaKind}
                    class="global-tiledimage {(imageGroup.length > 1 || images.length == 3) ? 'global-setaspectratio' : ''}"
                    onload={() => onmediastatus?.(image, "loaded")}
                    onerror={() => onmediastatus?.(image, "failed")}
                />
            {/each}
        </div>
    {/each}
</div>


<style>

    .images {
        border-radius: 8px;
		max-width: min(550px, 100%);
        .image-row {
            display: grid;
            grid-auto-columns: minmax(0, 1fr);
            grid-auto-flow: column;
            width: 100%;
            gap: 4px;
            margin-bottom: 4px;
        }
    }

    .images > .image-row > :global(.global-tiledimage) {
        object-fit: cover;
        width: 100%;
        height: auto;
        border-radius: 3px;
    }

    .images > .image-row > :global(.global-tiledimage.global-setaspectratio) {
        min-width: 0;
    }

    /*
    3 image layout is special - flip the layout:

    +---+ +---+
    | 1 | | 2 |          +---------++---+
    +---+ +---+          |         || 1 |
    +---------+     ➤   |    3    |+---+
    |         |          |         |+---+
    |    3    |          |         || 2 |
    |         |          +---------++---+
    |         |
    +---------+
    */
    .images.images3 {
        display: flex;
        gap: 4px;
        max-width: min(550px, 100%);

        .image-row {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .image-row:nth-child(1) {
            width: 66.7%;
        }
        .image-row:nth-child(2) {
            width: 33%;
        }
    }

    /* render image inline if it is the only image and it is an attachment */
    .images.inline {
        width: 100%;
        max-width: 100%;
    }

    .images.inline .image-row {
        display: block;
        width: 100%;
        max-width: 100%;
    }

    .inline > .image-row > :global(.global-tiledimage) {
        display: inline-block;
        width: auto;
        max-width: 100%;
        margin-inline: 0 auto;
        vertical-align: top;
    }

    .inline :global(img) {
        max-width: 100%;
        max-height: 400px;
        width: auto;
        height: auto;
        object-fit: contain;
    }
</style>
