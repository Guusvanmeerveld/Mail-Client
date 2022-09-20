import useLocalStorageState from "use-local-storage-state";

import { FC, useEffect, MouseEvent, useMemo } from "react";
import { useQuery } from "react-query";
import { Navigate } from "react-router-dom";

import { LocalToken, LoginResponse } from "@dust-mail/typings";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";

import scrollbarStyles from "@styles/scrollbar";

import useFetch from "@utils/hooks/useFetch";
import useLogin from "@utils/hooks/useLogin";
import useLogout from "@utils/hooks/useLogout";
import useStore from "@utils/hooks/useStore";
import useTheme from "@utils/hooks/useTheme";
import useUser from "@utils/hooks/useUser";
import useWindowWidth from "@utils/hooks/useWindowWidth";

import BoxesList from "@components/Boxes/List";
import Layout from "@components/Layout";
import MessageActionButton from "@components/Message/ActionButton";
import MessageList from "@components/Message/List";
import MessageOverview from "@components/Message/Overview";

const defaultMessageListWidth = 400;

const Dashboard: FC = () => {
	const theme = useTheme();

	const [accessToken] = useLocalStorageState<LocalToken>("accessToken");
	const [refreshToken] = useLocalStorageState<LocalToken>("refreshToken");

	const setFetching = useStore((state) => state.setFetching);

	const fetcher = useFetch();

	const logout = useLogout();
	const login = useLogin();

	const scrollBarSx = useMemo(() => scrollbarStyles(theme), [theme]);

	const accessTokenExpired = useMemo(
		() => accessToken && new Date(accessToken?.expires).getTime() < Date.now(),
		[accessToken]
	);

	if (
		accessTokenExpired &&
		refreshToken &&
		new Date(refreshToken?.expires).getTime() < Date.now()
	) {
		logout();
	}

	const {
		data: tokens,
		error: tokensError,
		isFetching: isFetchingTokens
	} = useQuery<LoginResponse>(
		"refreshTokens",
		() => fetcher.refresh(refreshToken?.body),
		{
			enabled: !!(accessTokenExpired && refreshToken)
		}
	);

	useEffect(() => {
		if (tokensError) setFetching(false);
		else setFetching(isFetchingTokens);
	}, [isFetchingTokens, tokensError]);

	useEffect(() => {
		if (tokens) login(tokens);
	}, [tokens]);

	const user = useUser();

	const [messageListWidth, setMessageListWidth] = useLocalStorageState<number>(
		"messageListWidth",
		{
			defaultValue: defaultMessageListWidth
		}
	);

	const [boxesListWidth, setBoxesListWidth] = useLocalStorageState<number>(
		"boxesListWidth",
		{
			defaultValue: 300
		}
	);

	const widthSetters = useMemo(
		() => ({
			boxes: setBoxesListWidth,
			messages: setMessageListWidth
		}),
		[setBoxesListWidth, setMessageListWidth]
	);

	const fullpageHeight = useMemo(
		() => `calc(100vh - ${theme.spacing(8)})`,
		[theme.spacing]
	);

	const windowWidth = useWindowWidth();

	const grabberWidth = 2;

	const handleDragStart = useMemo(
		() =>
			(
				originalWidth: number,
				dragEvent: MouseEvent,
				component: keyof typeof widthSetters
			): void => {
				const pageX = dragEvent.pageX;

				const run = (moveEvent: globalThis.MouseEvent): void => {
					moveEvent.preventDefault();

					const difference = pageX - moveEvent.pageX;

					const newWidth = originalWidth - difference;

					if (newWidth >= 200 && newWidth <= 600)
						widthSetters[component](newWidth);
				};

				const unsub = (): void => {
					document.removeEventListener("mousemove", run);
					document.removeEventListener("mouseup", unsub);
				};

				document.addEventListener("mousemove", run);
				document.addEventListener("mouseup", unsub);
			},
		[widthSetters]
	);

	const isMobile = theme.breakpoints.values.md >= windowWidth;

	useEffect(
		() =>
			isMobile
				? setMessageListWidth(windowWidth)
				: setMessageListWidth(defaultMessageListWidth),
		[isMobile]
	);

	return (
		<>
			{!user.isLoggedIn && <Navigate to="/" replace={true} />}
			<Layout withNavbar>
				<Stack direction="row" sx={{ height: fullpageHeight }}>
					{!isMobile && (
						<>
							<Box
								sx={{
									...scrollBarSx,
									width: boxesListWidth,
									overflowY: "scroll"
								}}
							>
								<BoxesList />
							</Box>

							<Box
								onMouseDown={(e: MouseEvent) =>
									handleDragStart(boxesListWidth, e, "boxes")
								}
								sx={{
									width: `${grabberWidth}px`,
									bgcolor: theme.palette.divider,
									cursor: "col-resize"
								}}
							/>
						</>
					)}

					<Box
						sx={{
							...scrollBarSx,
							width: messageListWidth,
							overflowX: "hidden",
							overflowY: "scroll"
						}}
					>
						<MessageList />
					</Box>

					<Box
						onMouseDown={(e: MouseEvent) =>
							handleDragStart(messageListWidth, e, "messages")
						}
						sx={{
							width: `${grabberWidth}px`,
							bgcolor: theme.palette.divider,
							cursor: "col-resize"
						}}
					/>

					{!isMobile && (
						<Stack
							direction="column"
							spacing={1}
							sx={{
								width:
									windowWidth -
									messageListWidth -
									(isMobile ? 0 : boxesListWidth) -
									grabberWidth * 2,
								transition: theme.transitions.create(["width", "transform"], {
									duration: theme.transitions.duration.standard
								}),
								px: 3,
								py: 1
							}}
						>
							<MessageOverview />
						</Stack>
					)}
				</Stack>

				<MessageActionButton />
			</Layout>
		</>
	);
};

export default Dashboard;
