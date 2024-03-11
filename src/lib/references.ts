import { ContentRef, Revision, RevisionPageDocument, Space } from '@gitbook/api';
import assertNever from 'assert-never';

import {
    ContentPointer,
    getCollection,
    getRevisionFile,
    getSpace,
    getSpaceContentData,
    getUserById,
    ignoreAPIError,
} from './api';
import { gitbookAppHref, pageHref, PageHrefContext } from './links';
import { resolvePageId } from './pages';

export interface ResolvedContentRef {
    /** Text to render in the content ref */
    text: string;
    /** Emoji associated with the reference */
    emoji?: string;
    /** URL to open for the content ref */
    href: string;
    /** True if the content ref is active */
    active: boolean;
    /** Image size, if the reference is a image file */
    fileDimensions?: { width: number; height: number };
}

export interface ContentRefContext extends PageHrefContext {
    space: Space;
    revisionId: string;
    pages: Revision['pages'];
    page?: RevisionPageDocument;
}

/**
 * Resolve a content reference to be rendered.
 */
export async function resolveContentRef(
    contentRef: ContentRef,
    { space, revisionId, pages, page: activePage, ...linksContext }: ContentRefContext,
): Promise<ResolvedContentRef | null> {
    switch (contentRef.kind) {
        case 'url': {
            return {
                href: contentRef.url,
                text: contentRef.url,
                active: false,
            };
        }

        case 'file': {
            const file = await getRevisionFile(space.id, revisionId, contentRef.file);
            if (file) {
                return {
                    href: file.downloadURL,
                    text: file.name,
                    active: false,
                    fileDimensions: file.dimensions,
                };
            } else {
                return null;
            }
        }

        case 'anchor':
        case 'page': {
            if (contentRef.space && contentRef.space !== space.id) {
                return resolveContentRefInSpace(contentRef.space, contentRef);
            }

            const page =
                !contentRef.page || contentRef.page === activePage?.id
                    ? activePage
                    : resolvePageId(pages, contentRef.page)?.page;
            if (!page) {
                return null;
            }

            if (contentRef.kind === 'page') {
                return {
                    href: pageHref(pages, page, linksContext),
                    text: page.title,
                    emoji: page.emoji,
                    active: page.id === activePage?.id,
                };
            }

            const isCurrentPage = page.id === activePage?.id;
            return {
                href: pageHref(pages, page, linksContext, contentRef.anchor),
                text: (isCurrentPage ? '' : page.title) + '#' + contentRef.anchor,
                emoji: isCurrentPage ? undefined : page.emoji,
                active: false,
            };
        }

        case 'space': {
            const targetSpace =
                contentRef.space === space.id
                    ? space
                    : await ignoreAPIError(getSpace(contentRef.space));
            if (!targetSpace) {
                return {
                    href: gitbookAppHref(`/s/${contentRef.space}`),
                    text: 'space',
                    active: false,
                };
            }

            return {
                href: targetSpace.urls.published ?? targetSpace.urls.app,
                text: targetSpace.title,
                active: true,
            };
        }

        case 'user': {
            const user = await getUserById(contentRef.user);
            if (user) {
                return {
                    href: `mailto:${user.email}`,
                    text: user.displayName ?? user.email,
                    active: false,
                };
            } else {
                return null;
            }
        }

        case 'snippet': {
            return {
                href: gitbookAppHref(`/o/${contentRef.organization}/snippet/${contentRef.snippet}`),
                text: 'snippet',
                active: false,
            };
        }

        case 'collection': {
            const collection = await ignoreAPIError(getCollection(contentRef.collection));
            if (!collection) {
                return {
                    href: gitbookAppHref(`/s/${contentRef.collection}`),
                    text: 'collection',
                    active: false,
                };
            }

            return {
                href: collection.urls.app,
                text: collection.title,
                active: false,
            };
        }

        case 'synced-block': {
            return null;
        }

        default:
            assertNever(contentRef);
    }
}

async function resolveContentRefInSpace(spaceId: string, contentRef: ContentRef) {
    const pointer: ContentPointer = {
        spaceId,
    };

    const result = await ignoreAPIError(getSpaceContentData(pointer));
    if (!result) {
        return null;
    }

    const { space, pages } = result;
    return resolveContentRef(contentRef, {
        space,
        revisionId: space.revision,
        pages,
    });
}
