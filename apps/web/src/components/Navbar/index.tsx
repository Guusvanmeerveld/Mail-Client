import { FC, memo, useMemo, useState, MouseEvent, KeyboardEvent } from "react";

import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";

import MenuIcon from "@mui/icons-material/Menu";
import NavigateNext from "@mui/icons-material/NavigateNext";

import useSelectedBox from "@utils/hooks/useSelectedBox";
import useStore from "@utils/hooks/useStore";
import useTheme from "@utils/hooks/useTheme";

import Avatar from "@components/Navbar/Avatar";
import Drawer from "@components/Navbar/Drawer";

const UnMemoizedNavbar: FC = () => {
	const theme = useTheme();

	const fetching = useStore((state) => state.fetching);

	const [drawerState, setDrawerState] = useState(false);

	const [selectedBox, setSelectedBox] = useSelectedBox();

	const toggleDrawer = useMemo(
		() => (open: boolean) => (event: KeyboardEvent | MouseEvent) => {
			if (
				event.type === "keydown" &&
				((event as KeyboardEvent).key === "Tab" ||
					(event as KeyboardEvent).key === "Shift")
			) {
				return;
			}

			setDrawerState(open);
		},
		[]
	);

	const secondaryColor = useMemo(
		() =>
			theme.palette.mode == "dark"
				? theme.palette.text.secondary
				: theme.palette.primary.contrastText,
		[theme.palette]
	);

	const primaryColor = useMemo(
		() =>
			theme.palette.mode == "dark"
				? theme.palette.text.primary
				: theme.palette.primary.contrastText,
		[theme.palette]
	);

	const breadcrumbs = useMemo(() => {
		const boxNameSplit = selectedBox?.name.split(".");

		return boxNameSplit?.map((crumb, i) => {
			const boxName = boxNameSplit.slice(0, i + 1).join(".");

			return (
				<Typography
					sx={{
						color: boxName == selectedBox?.name ? primaryColor : secondaryColor,
						cursor: boxName == selectedBox?.name ? "inherit" : "pointer"
					}}
					key={boxName}
					onClick={() => {
						if (boxName == selectedBox?.name) return;

						setSelectedBox({ id: boxName, name: boxName });
					}}
				>
					{crumb}
				</Typography>
			);
		});
	}, [selectedBox?.name, primaryColor, secondaryColor]);

	return (
		<>
			<AppBar position="relative">
				<>
					<Toolbar>
						<Stack
							direction="row"
							sx={{ flexGrow: 1, alignItems: "center" }}
							spacing={2}
						>
							<IconButton
								size="large"
								edge="start"
								color="inherit"
								aria-label="menu"
								sx={{
									display: { md: "none", sm: "inline-flex" }
								}}
								onClick={toggleDrawer(true)}
							>
								<MenuIcon />
							</IconButton>

							<Stack
								sx={{
									display: { md: "flex", xs: "none" }
								}}
								alignItems="center"
								direction="row"
								spacing={3}
							>
								<img
									src="/android-chrome-192x192.png"
									style={{ width: theme.spacing(5) }}
									alt="Logo"
								/>
								<Typography variant="h6">
									{import.meta.env.VITE_APP_NAME}
								</Typography>
							</Stack>

							{breadcrumbs && (
								<Breadcrumbs
									sx={{
										color: secondaryColor
									}}
									separator={<NavigateNext fontSize="small" />}
									aria-label="breadcrumb"
								>
									{breadcrumbs}
								</Breadcrumbs>
							)}
						</Stack>

						<Avatar />
					</Toolbar>
					{fetching && (
						<Box sx={{ position: "absolute", bottom: 0, width: 1, height: 2 }}>
							<LinearProgress color="secondary" />
						</Box>
					)}
				</>
			</AppBar>

			<Drawer drawerState={drawerState} toggleDrawer={toggleDrawer} />
		</>
	);
};

const Navbar = memo(UnMemoizedNavbar);

export default Navbar;
